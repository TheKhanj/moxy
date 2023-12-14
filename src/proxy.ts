import {
  DynamicModule,
  Inject,
  Injectable,
  Logger,
  Module,
} from "@nestjs/common";
import * as net from "net";
import { Transform } from "node:stream";

import { UserFactory, UserStatsService } from "./user";
import { withErrorLogging } from "./utils";
import { ProxyConfig, UserProxyConfig } from "./config";
import { EventModule, MoxyEventEmitter } from "./event";

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
    private readonly eventEmmiter: MoxyEventEmitter,
    private readonly counterFlushTimeout: number
  ) {
    this.server = this.getServer();
  }

  public listen() {
    return new Promise<void>((res, rej) => {
      const server = this.server.listen(this.listeningPort, () => {
        this.logger.log(
          `Started tcp proxy ${this.listeningPort} -> ${this.forwardingAddress}:${this.forwardingPort}`
        );
        res();
      });
      server.on("error", rej);
    });
  }

  public destroy() {
    return new Promise<void>((res, rej) => {
      this.server.close((err) => {
        if (err) rej(err);
        this.logger.log(
          `Destroyed tcp proxy ${this.listeningPort} -> ${this.forwardingAddress}:${this.forwardingPort}`
        );
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

  private readonly logger = new Logger("ProxyStorage");

  public constructor(
    private readonly eventEmiter: MoxyEventEmitter,
    @Inject("CounterFlushTimeout")
    private readonly counterTimeout: number,
    userFactory: UserFactory,
    userStatsService: UserStatsService
  ) {
    this.eventEmiter.on("new-user", (userConfig) =>
      withErrorLogging(async () => {
        await userStatsService.assert(userConfig.key);
        const user = await userFactory.get(userConfig.key);
        if (!user.isEnabled()) return;
        await this.add(user.config.key, user.config.proxy);
      }, this.logger)
    );
    this.eventEmiter.on("enable-user", (userKey) =>
      withErrorLogging(async () => {
        await userStatsService.assert(userKey);
        const user = await userFactory.get(userKey);
        await this.add(user.config.key, user.config.proxy);
      }, this.logger)
    );
    this.eventEmiter.on("delete-user", (userKey) => {
      this.delete(userKey).catch((err) => this.logger.error(err));
    });
    this.eventEmiter.on("disable-user", (userKey) =>
      withErrorLogging(async () => {
        await userStatsService.assert(userKey);
        const user = await userFactory.get(userKey);
        await this.delete(user.config.key);
      }, this.logger)
    );
    this.eventEmiter.on("update-user", (prev, curr) =>
      withErrorLogging(async () => {
        const changedConfig =
          JSON.stringify(prev.proxy) !== JSON.stringify(curr.proxy);
        if (!changedConfig) return;
        await userStatsService.assert(curr.key);
        const user = await userFactory.get(curr.key);
        await this.delete(user.config.key).catch((err) =>
          this.logger.warn(err)
        );
        if (!user.isEnabled()) return;
        await this.add(user.config.key, user.config.proxy);
      }, this.logger)
    );
  }

  public async add(userKey: string, config: UserProxyConfig): Promise<Proxy> {
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
    await proxy.listen();

    return proxy;
  }

  public get(userKey: string) {
    const proxy = this.proxies[userKey];

    if (!proxy) throw new Error(`Proxy for user ${userKey} not found`);

    return proxy;
  }

  public async delete(userKey: string): Promise<void> {
    const proxy = this.get(userKey);
    delete this.proxies[userKey];

    await proxy.destroy();
  }
}

function createCounterStream(
  eventEmitter: MoxyEventEmitter,
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
    configModule: DynamicModule,
    userModule: DynamicModule
  ): DynamicModule {
    return {
      module: ProxyModule,
      imports: [configModule, userModule],
      providers: [
        {
          provide: "CounterFlushTimeout",
          useValue: config.counter.flushTimeout,
        },
      ],
    };
  }
}
