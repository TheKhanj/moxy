import EventEmitter from "node:events";
import { Inject, Injectable } from "@nestjs/common";

import { TcpProxy } from "./tcp.proxy";
import { TRAFFIC_EVENT_EMITTER } from "../traffic.event.emitter.module";

@Injectable()
export class ProxyStorage {
  private readonly proxies: Record<string, TcpProxy> = {};

  public constructor(
    @Inject(TRAFFIC_EVENT_EMITTER)
    private readonly eventEmiter: EventEmitter,
    @Inject("CounterTimeout")
    private readonly counterTimeout: number,
  ) {}

  public add(
    userKey: string,
    listentingPort: number,
    forwardingPort: number,
  ): TcpProxy {
    const proxy = new TcpProxy(
      userKey,
      listentingPort,
      forwardingPort,
      this.eventEmiter,
      this.counterTimeout,
    );

    this.proxies[userKey] = proxy;
    proxy.listen();

    return proxy;
  }

  public get(userKey: string) {
    const proxy = this.proxies[userKey];

    if (!proxy) throw new Error(`proxy for usre ${userKey} not found`);

    return proxy;
  }

  public delete(userKey: string): void {
    const proxy = this.get(userKey);

    proxy.destroy();
  }
}
