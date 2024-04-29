import { Proxy } from "./proxy";
import { TcpProxy } from "./tcp.proxy";
import { UserProxyConfig } from "../config/config.dto";
import { ProxyEventEmitter } from "./proxy.event";

export class ProxyStorage {
  private readonly proxies: Record<string, Proxy> = {};

  public constructor(private readonly eventEmitter: ProxyEventEmitter) {}

  public async add(userKey: string, config: UserProxyConfig): Promise<Proxy> {
    let proxy: Proxy;
    switch (config.protocol) {
      case "tcp":
        proxy = new TcpProxy(
          userKey,
          config.listeningPort,
          config.forwardingPort,
          config.forwardingAddress,
          this.eventEmitter,
          config.flushInterval,
          config.socketTimeout
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
