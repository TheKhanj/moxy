import { EventEmitter } from "node:events";

export interface ProxyEventEmitter extends EventEmitter {
  emit(
    eventName: "traffic",
    type: "up" | "down",
    userKey: string,
    amount: number
  ): boolean;
  on(
    eventName: "traffic",
    listener: (type: "up" | "down", userKey: string, amount: number) => void
  ): this;
}

export class ProxyEventEmitter
  extends EventEmitter
  implements ProxyEventEmitter {}
