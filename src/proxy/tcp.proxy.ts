import * as net from "net";
import { Logger } from "@nestjs/common";
import { EventEmitter } from "node:events";

import { TrafficEvent } from "../event/traffic.event";

const logger = new Logger("TcpProxy");

export class TcpProxy {
  private readonly server: net.Server;

  public constructor(
    private readonly userKey: string,
    private readonly listeningPort: number,
    private readonly forwardingPort: number,
    private readonly eventEmmiter: EventEmitter,
    private readonly isUserEnabled: () => Promise<boolean>,
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

  /**
   * TODO: possibility of memory overflow in case of forward socket bottleneck
   */
  private forwardPackets(
    client: net.Socket,
    forward: net.Socket,
    type: TrafficEvent["type"],
  ) {
    const dataQueue: Buffer[] = [];
    let dequeing = false;

    const dequeue = async () => {
      while (true) {
        const chunk = dataQueue.shift();
        if (chunk === undefined) break;

        const isUserEnabled = await this.isUserEnabled();
        if (!isUserEnabled) continue;

        const ev = new TrafficEvent(type, this.userKey, chunk.length);
        const hasListeners = this.eventEmmiter.emit(TrafficEvent.eventName, ev);
        if (!hasListeners)
          logger.warn(
            `Events for user ${this.userKey} does not have any listener`,
          );

        await new Promise<void>((resolve, reject) => {
          if (forward.destroyed) return;

          forward.write(chunk, (err) => {
            if (err) reject(err);
            resolve();
          });
        });
      }

      dequeing = false;
    };

    client.on("data", (chunk: Buffer) => {
      dataQueue.push(chunk);
      if (dequeing) return;
      dequeing = true;
      dequeue().catch((err) => logger.error(err));
    });
  }

  private getServer() {
    return net.createServer((clientSocket) => {
      // TODO: add recovery mechanism
      const forwardSocket = net.createConnection(
        this.forwardingPort,
        "0.0.0.0",
        () => {
          logger.log(`Connected to forward port: ${this.forwardingPort}`);

          this.forwardPackets(clientSocket, forwardSocket, "up");
          this.forwardPackets(forwardSocket, clientSocket, "down");
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
