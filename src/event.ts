import { Module } from "@nestjs/common";
import { EventEmitter } from "node:events";

import { UserConfig } from "./config";

export interface MoxyEventEmitter extends EventEmitter {
  emit(
    eventName: "traffic",
    type: "up" | "down",
    userKey: string,
    amount: number
  ): boolean;
  emit(eventName: "new-user", user: UserConfig): boolean;
  emit(
    eventName: "update-user",
    previous: UserConfig,
    current: UserConfig
  ): boolean;
  emit(eventName: "disable-user", userKey: string): boolean;
  emit(eventName: "enable-user", userKey: string): boolean;
  emit(eventName: "delete-user", userKey: string): boolean;
  on(
    eventName: "traffic",
    listener: (type: "up" | "down", userKey: string, amount: number) => void
  ): this;
  on(eventName: "new-user", listener: (user: UserConfig) => void): this;
  on(
    eventName: "update-user",
    listener: (previous: UserConfig, current: UserConfig) => void
  ): this;
  on(eventName: "disable-user", listener: (userKey: string) => void): this;
  on(eventName: "enable-user", listener: (userKey: string) => void): this;
  on(eventName: "delete-user", listener: (userKey: string) => void): this;
}

export class MoxyEventEmitter
  extends EventEmitter
  implements MoxyEventEmitter {}

@Module({
  exports: [MoxyEventEmitter],
  providers: [MoxyEventEmitter],
})
export class EventModule {}
