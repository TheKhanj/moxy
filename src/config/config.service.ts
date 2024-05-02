import { z } from "zod";
import { Mutex } from "async-mutex";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs";

import { Config } from "./config";
import { Logger } from "../logger";
import { ConfigEventEmitter } from "./config.event";
import { IConfig, ConfigSchema, IUserConfig } from "./config.dto";

export function parseConfig(config: z.input<typeof ConfigSchema>): IConfig {
  const parsed = ConfigSchema.parse(config);

  Object.keys(parsed.users).forEach((key) => {
    parsed.users[key].key = key;
  });

  return parsed;
}

type ReadConfig = () => Promise<Config>;
type WriteConfig = (config: IConfig) => Promise<void>;

export function readConfigFile(file: string): ReadConfig {
  return async () => {
    const content = await promisify(readFile)(file);
    const json = JSON.parse(content.toString());

    return new Config(parseConfig(json));
  };
}

export function writeConfigFile(file: string): WriteConfig {
  return async (config: IConfig) => {
    const buffer = Buffer.from(JSON.stringify(config, null, 2));
    await promisify(writeFile)(file, buffer);
  };
}

export class ConfigService {
  private cache?: Config;
  private readonly logger = new Logger("ConfigService");
  private readonly mutex = new Mutex();

  public constructor(
    private readonly eventEmitter: ConfigEventEmitter,
    private readonly readConfigFromOrigin: ReadConfig,
    private readonly writeConfigToOrigin: WriteConfig
  ) {
    process.on("SIGHUP", () => {
      this.logger.info("Reloading config");
      this.reloadCache().catch((err) => this.logger.err(err));
    });
  }

  public async get(): Promise<Config> {
    if (this.cache) return this.cache;

    return this.reloadCache();
  }

  public async update(config: IConfig) {
    await this.mutex.acquire();
    await this.writeConfigToOrigin(config).finally(() => this.mutex.release());
    await this.reloadCache();
  }

  public async updateUserConfig(userConfig: IUserConfig): Promise<void> {
    const config = await this.get();
    config.users[userConfig.key] = userConfig;
    await this.update(config);
  }

  public async reloadCache(): Promise<Config> {
    const oldConfig = this.cache;
    this.cache = await this.readConfig();

    await this.emitChangeEvents(this.cache, oldConfig);

    this.logger.info("Reloaded config");

    return this.cache;
  }

  private async readConfig() {
    await this.mutex.acquire();
    return this.readConfigFromOrigin().finally(() => this.mutex.release());
  }

  private async emitChangeEvents(newConfig: IConfig, oldConfig?: IConfig) {
    const newUsersKeys = Object.keys(newConfig.users).filter((newUserKey) =>
      oldConfig ? !oldConfig.users[newUserKey] : true
    );
    const deletedUsersKeys = oldConfig
      ? Object.keys(oldConfig.users).filter(
          (oldUserKey) => !newConfig.users[oldUserKey]
        )
      : [];
    const updatedUsersKeys = oldConfig
      ? Object.keys(oldConfig.users).filter((oldUserKey) => {
          const oldUser = oldConfig.users[oldUserKey];
          const newUser = newConfig.users[oldUserKey];
          if (!newUser) return false;
          const sameConfig =
            JSON.stringify(oldUser) === JSON.stringify(newUser);
          return !sameConfig;
        })
      : [];

    deletedUsersKeys.forEach((deletedUserKey) =>
      this.eventEmitter.emit("delete-user", oldConfig!.users[deletedUserKey])
    );
    newUsersKeys.forEach((newUserKey) =>
      this.eventEmitter.emit("new-user", newConfig.users[newUserKey])
    );
    updatedUsersKeys.forEach((changedUserKey) => {
      this.eventEmitter.emit(
        "update-user",
        oldConfig!.users[changedUserKey],
        newConfig.users[changedUserKey]
      );
    });
  }
}
