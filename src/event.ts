import { Module } from "@nestjs/common";
import { EventEmitter } from "node:events";

export interface TrafficEventEmitter extends EventEmitter {
  emit(
    eventName: "traffic",
    type: "up" | "down",
    userKey: string,
    amount: number
  ): boolean;
  addListener(
    eventName: "traffic",
    listener: (type: "up" | "down", userKey: string, amount: number) => void
  ): this;
  on(
    eventName: "traffic",
    listener: (type: "up" | "down", userKey: string, amount: number) => void
  ): this;
}

export class TrafficEventEmitter
  extends EventEmitter
  implements TrafficEventEmitter {}

@Module({
  exports: [TrafficEventEmitter],
  providers: [TrafficEventEmitter],
})
export class EventModule {}
