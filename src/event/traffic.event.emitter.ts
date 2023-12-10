import EventEmitter from "events";

export class TrafficEventEmitter extends EventEmitter {
  public emit(
    eventName: "traffic",
    type: "up" | "down",
    userKey: string,
    amount: number,
  ): boolean;
  public emit(eventName: string | symbol, ...args: any[]): boolean {
    return super.emit(eventName, ...args);
  }

  public addListener(
    eventName: "traffic",
    listener: (type: "up" | "down", userKey: string, amount: number) => void,
  ): this;
  public addListener(
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    return super.addListener(eventName, listener);
  }

  public on(
    eventName: "traffic",
    listener: (type: "up" | "down", userKey: string, amount: number) => void,
  ): this;
  public on(
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    return super.on(eventName, listener);
  }
}
