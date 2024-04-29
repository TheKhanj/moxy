import EventEmitter from "node:events";

import { IUserConfig } from "./config.dto";

export interface ConfigEventEmitter extends EventEmitter {
  emit(eventName: "new-user", user: IUserConfig): boolean;
  emit(eventName: "delete-user", user: IUserConfig): boolean;
  emit(
    eventName: "update-user",
    previous: IUserConfig,
    current: IUserConfig
  ): boolean;
  on(eventName: "new-user", listener: (user: IUserConfig) => void): this;
  on(eventName: "delete-user", listener: (user: IUserConfig) => void): this;
  on(
    eventName: "update-user",
    listener: (previous: IUserConfig, current: IUserConfig) => void
  ): this;
}

export class ConfigEventEmitter
  extends EventEmitter
  implements ConfigEventEmitter {}
