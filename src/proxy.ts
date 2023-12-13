import {
  DynamicModule,
  Inject,
  Injectable,
  Logger,
  Module,
} from "@nestjs/common";
import * as net from "net";
import { Transform } from "node:stream";

import { UserModule } from "./user";
import { DatabaseConfig, ProxyConfig, UserProxyConfig } from "./config";
import { EventModule, TrafficEventEmitter } from "./event";

interface Proxy {
  listen(): Promise<void>;
  destroy(): Promise<void>;
}

class TcpProxy implements Proxy {
  private readonly logger = new Logger("TcpProxy");
  private readonly server: net.Server;

  public constructor(
    private readonly userKey: string,
    private readonly listeningPort: number,
    private readonly forwardingPort: number,
    private readonly forwardingAddress: string,
    private readonly eventEmmiter: TrafficEventEmitter,
    private readonly counterFlushTimeout: number
  ) {
    this.server = this.getServer();
  }

  public listen() {
    return new Promise<void>((res) => {
      this.server.listen(this.listeningPort, () => {
        this.logger.log(
          `Server listening on port ${this.listeningPort} and forwarding to ${this.forwardingPort}`
        );
        res();
      });
    });
  }

  public destroy() {
    return new Promise<void>((res, rej) => {
      this.server.close((err) => {
        if (err) rej(err);
        res();
      });
    });
  }

  private getServer() {
    return net.createServer((clientSocket) => {
      // TODO: add recovery mechanism
      const forwardSocket = net.createConnection(
        this.forwardingPort,
        this.forwardingAddress,
        () => {
          this.logger.log(`Connected to forward port: ${this.forwardingPort}`);

          const upCounter = createCounterStream(
            this.eventEmmiter,
            "up",
            this.userKey,
            this.counterFlushTimeout
          );

          const downCounter = createCounterStream(
            this.eventEmmiter,
            "down",
            this.userKey,
            this.counterFlushTimeout
          );

          clientSocket.pipe(upCounter);
          upCounter.pipe(forwardSocket);

          forwardSocket.pipe(downCounter);
          downCounter.pipe(clientSocket);
        }
      );

      clientSocket.on("close", () => {
        this.logger.log(
          `Client disconnected: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`
        );
        forwardSocket.end();
      });

      clientSocket.on("error", (err) => {
        this.logger.error(`Client socket error: ${err}`);
      });

      forwardSocket.on("error", (err) => {
        this.logger.error(`Forward socket error: ${err}`);
        clientSocket.destroy();
      });
    });
  }
}

@Injectable()
export class ProxyStorage {
  private readonly proxies: Record<string, Proxy> = {};

  public constructor(
    private readonly eventEmiter: TrafficEventEmitter,
    @Inject("CounterFlushTimeout")
    private readonly counterTimeout: number
  ) {}

  public add(userKey: string, config: UserProxyConfig): Proxy {
    let proxy: Proxy;
    switch (config.protocol) {
      case "tcp":
        proxy = new TcpProxy(
          userKey,
          config.listeningPort,
          config.forwardingPort,
          config.forwardingAddress,
          this.eventEmiter,
          this.counterTimeout
        );
        break;
      default:
        throw new Error(
          `No implementation is available for ${config.protocol} proxy`
        );
    }

    this.proxies[userKey] = proxy;
    proxy.listen();

    return proxy;
  }

  public get(userKey: string) {
    const proxy = this.proxies[userKey];

    if (!proxy) throw new Error(`Proxy for user ${userKey} not found`);

    return proxy;
  }

  public delete(userKey: string): void {
    const proxy = this.get(userKey);

    proxy.destroy();
  }
}

function createCounterStream(
  eventEmitter: TrafficEventEmitter,
  type: "up" | "down",
  userKey: string,
  timeout: number
) {
  let length = 0;
  let flushTimeout: NodeJS.Timeout | null = null;

  const flushEvent = () => {
    eventEmitter.emit("traffic", type, userKey, length);
    length = 0;

    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
  };

  return new Transform({
    transform(chunk: Buffer, _, callback) {
      length += chunk.length;

      if (!flushTimeout) flushTimeout = setTimeout(flushEvent, timeout);

      this.push(chunk);
      callback();
    },
    final(callback) {
      flushEvent();

      callback();
    },
  });
}

@Module({
  imports: [EventModule],
  providers: [ProxyStorage],
})
export class ProxyModule {
  public static register(
    config: ProxyConfig,
    databaseConfig: DatabaseConfig
  ): DynamicModule {
    return {
      module: ProxyModule,
      imports: [UserModule.register(databaseConfig)],
      providers: [
        {
          provide: "CounterFlushTimeout",
          useValue: config.counter.flushTimeout,
        },
      ],
    };
  }
}
