import * as net from "net";
import { Logger } from "@nestjs/common";

import { TrafficEventEmitter } from "../event/traffic.event.emitter";
import { createCounterStream } from "./counter.stream";

const logger = new Logger("TcpProxy");

export class TcpProxy {
  private readonly server: net.Server;

  public constructor(
    private readonly userKey: string,
    private readonly listeningPort: number,
    private readonly forwardingPort: number,
    private readonly eventEmmiter: TrafficEventEmitter,
    private readonly counterTimeout: number,
  ) {
    this.server = this.getServer();
  }

  public listen() {
    this.server.listen(this.listeningPort, () => {
      logger.log(
        `Server listening on port ${this.listeningPort} and forwarding to ${this.forwardingPort}`,
      );
    });
  }

  public destroy() {
    this.server.close();
  }

  private getServer() {
    return net.createServer((clientSocket) => {
      // TODO: add recovery mechanism
      const forwardSocket = net.createConnection(
        this.forwardingPort,
        "0.0.0.0",
        () => {
          logger.log(`Connected to forward port: ${this.forwardingPort}`);

          const upCounter = createCounterStream(
            this.eventEmmiter,
            "up",
            this.userKey,
            this.counterTimeout,
          );

          const downCounter = createCounterStream(
            this.eventEmmiter,
            "down",
            this.userKey,
            this.counterTimeout,
          );

          clientSocket.pipe(upCounter);
          upCounter.pipe(forwardSocket);

          forwardSocket.pipe(downCounter);
          downCounter.pipe(clientSocket);
        },
      );

      clientSocket.on("close", () => {
        logger.log(
          `Client disconnected: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`,
        );
        forwardSocket.end();
      });

      clientSocket.on("error", (err) => {
        logger.error(`Client socket error: ${err}`);
      });

      forwardSocket.on("error", (err) => {
        logger.error(`Forward socket error: ${err}`);
        clientSocket.destroy();
      });
    });
  }
}
