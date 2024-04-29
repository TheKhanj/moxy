import * as net from "net";
import EventEmitter from "node:events";

import { Proxy } from "./proxy";
import { Logger } from "../logger";
import { ProxyEventEmitter } from "./proxy.event";
import { createCounterStream } from "./counter.stream.factory";

export class TcpProxy implements Proxy {
  private listening = false;
  private readonly logger: Logger;
  private readonly server: net.Server;
  private readonly eventEmitter = new EventEmitter();

  private destroyed = false;

  public constructor(
    private readonly userKey: string,
    private readonly listeningPort: number,
    private readonly forwardingPort: number,
    private readonly forwardingAddress: string,
    private readonly proxyEventEmitter: ProxyEventEmitter,
    private readonly counterFlushTimeout: number,
    private readonly socketTimeout: number
  ) {
    this.logger = new Logger(
      `TcpProxy :${this.listeningPort} -> ${this.forwardingAddress}:${this.forwardingPort}`
    );
    this.server = this.getServer();
  }

  public listen() {
    if (this.destroyed) return Promise.resolve();
    if (this.listening) throw new Error("Server is already listening");

    this.listening = true;

    return new Promise<void>((res, rej) => {
      const server = this.server.listen(this.listeningPort, () => {
        this.logger.info("Started tcp proxy");
        res();
      });

      server.on("error", rej);
    });
  }

  public destroy() {
    if (this.destroyed) return Promise.resolve();

    this.eventEmitter.emit("destroy");

    return new Promise<void>((res, rej) => {
      this.server.close((err) => {
        if (err) rej(err);
        this.logger.info("Destroyed tcp proxy");
        this.destroyed = true;
        res();
      });
    });
  }

  private getServer() {
    const eventEmitter = this.eventEmitter;

    function handleClient(this: TcpProxy, clientSocket: net.Socket) {
      eventEmitter.once("destroy", () => {
        clientSocket.destroy();
      });

      const forwardSocket = net.createConnection(
        this.forwardingPort,
        this.forwardingAddress,
        () => {
          this.logger.info("Connected to forward port");

          const upCounter = createCounterStream(
            this.proxyEventEmitter,
            "up",
            this.userKey,
            this.counterFlushTimeout
          );

          const downCounter = createCounterStream(
            this.proxyEventEmitter,
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

      forwardSocket.setTimeout(this.socketTimeout);
      clientSocket.setTimeout(this.socketTimeout);

      clientSocket.on("close", () => {
        this.logger.info("Client disconnected");
        forwardSocket.end();
      });

      clientSocket.on("error", (err) => {
        this.logger.err(`Local socket error: ${err.toString()}`);
        clientSocket.end();
      });

      forwardSocket.on("close", () => {
        this.logger.info("Forward disconnected");
      });

      forwardSocket.on("error", (err) => {
        this.logger.err(`Forward socket error: ${err}`);
        clientSocket.end();
      });
    }

    return net.createServer(handleClient.bind(this));
  }
}
