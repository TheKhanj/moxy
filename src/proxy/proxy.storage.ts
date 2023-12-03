import EventEmitter from "node:events";
import { Inject, Injectable } from "@nestjs/common";

import { TcpProxy } from "./tcp.proxy";
import { UserService } from "../user/user.service";
import { TRRAFIC_EVENT_EMITTER } from "../trrafic.event.emitter.module";

@Injectable()
export class ProxyStorage {
  private readonly proxies: Record<string, TcpProxy> = {};

  public constructor(
    @Inject(TRRAFIC_EVENT_EMITTER)
    private readonly eventEmiter: EventEmitter,
    private readonly userService: UserService
  ) {}

  public add(
    userKey: string,
    listentingPort: number,
    forwardingPort: number
  ): TcpProxy {
    const proxy = new TcpProxy(
      userKey,
      listentingPort,
      forwardingPort,
      this.eventEmiter,
      async () => (await this.userService.get(userKey)).enabled
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
