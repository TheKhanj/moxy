import { ProxyStorage } from "./proxy.storage";
import { ProxyEventEmitter } from "./proxy.event";

export class ProxyModule {
  private constructor(
    private readonly eventEmitter: ProxyEventEmitter,
    private readonly proxyStorage: ProxyStorage
  ) {}

  public static create() {
    const eventEmitter = new ProxyEventEmitter();
    const proxyStorage = new ProxyStorage(eventEmitter);

    return new ProxyModule(eventEmitter, proxyStorage);
  }

  public get(key: "proxy-storage"): ProxyStorage;
  public get(key: "proxy-event-emitter"): ProxyEventEmitter;
  public get(key: string): unknown {
    switch (key) {
      case "proxy-storage":
        return this.proxyStorage;
      case "proxy-event-emitter":
        return this.eventEmitter;
      default:
        throw new Error("Unreachable code");
    }
  }
}
