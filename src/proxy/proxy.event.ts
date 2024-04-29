import { EventEmitter } from "node:events";

export interface ProxyEventEmitter extends EventEmitter {
  emit(
    eventName: "traffic",
    type: "up" | "down",
    userKey: string,
    amount: number
  ): boolean;
  emit(eventName: "disable-user", userKey: string): boolean;
  emit(eventName: "enable-user", userKey: string): boolean;
  on(
    eventName: "traffic",
    listener: (type: "up" | "down", userKey: string, amount: number) => void
  ): this;
  on(eventName: "disable-user", listener: (userKey: string) => void): this;
  on(eventName: "enable-user", listener: (userKey: string) => void): this;
}

export class ProxyEventEmitter
  extends EventEmitter
  implements ProxyEventEmitter {}
