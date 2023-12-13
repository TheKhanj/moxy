import { readFile } from "node:fs";
import { promisify } from "node:util";
import { DynamicModule, Injectable, Logger, Module } from "@nestjs/common";

import { ConfigSchema } from "./config.schema";
import { EventModule, MoxyEventEmitter } from "./event";

export type ExpirationDate = "unlimit" | string;

export type UserTcpProxyConfig = {
  protocol: "tcp";
  listeningPort: number;
  forwardingPort: number;
  forwardingAddress: string;
};

export type UserProxyConfig = UserTcpProxyConfig;

export type UserConfig = {
  key: string;
  remark?: string;
  limit: number | "unlimit";
  expirationDate: ExpirationDate;
  passthrough: boolean;
  proxy: UserProxyConfig;
};

export type MongoDbDatabaseDriverConfig = {
  type: "mongodb";
  url: string;
  databaseName: string;
};
export type MemoryDatabaseDriverConfig = {
  type: "memory";
};

export type FileDatabaseDriverConfig = {
  type: "file";
  path: string;
};

export type DatabaseDriverConfig =
  | MongoDbDatabaseDriverConfig
  | MemoryDatabaseDriverConfig
  | FileDatabaseDriverConfig;

export type LocalDatabaseMutexConfig = {
  type: "local";
};

export type DatabaseMutexConfig = LocalDatabaseMutexConfig;

export type DatabaseConfig = {
  driver: DatabaseDriverConfig;
  mutex: DatabaseMutexConfig;
  flush: number;
};

export type ProxyConfig = {
  counter: {
    flushTimeout: number;
  };
};

export type Config = {
  ttl: number;
  proxy: ProxyConfig;
  database: DatabaseConfig;
  users: UserConfig[];
};

@Injectable()
export class ConfigService {
  private cache?: Config;
  private oldCache?: Config;
  private readonly logger = new Logger("ConfigService");

  public constructor(
    private readonly file: string,
    cacheTtl: number,
    private readonly eventEmitter: MoxyEventEmitter
  ) {
    this.refreshCache().catch((err) => this.logger.error(err));

    setInterval(() => {
      this.refreshCache().catch((err) => this.logger.error(err));
    }, cacheTtl);
  }

  public static async readConfig(file: string): Promise<Config> {
    const content = await promisify(readFile)(file);
    const json = JSON.parse(content.toString());

    return ConfigSchema.parse(json);
  }

  public async getConfig(): Promise<Config> {
    if (this.cache) return this.cache;

    return this.refreshCache();
  }

  private async refreshCache(): Promise<Config> {
    this.oldCache = this.cache;
    this.cache = await ConfigService.readConfig(this.file);

    await this.emitChangeEvents(this.cache, this.oldCache);

    delete this["oldCache"];
    this.logger.log('Refreshed config cache')

    return this.cache;
  }

  private async emitChangeEvents(newConfig: Config, oldConfig?: Config) {
    const newUsers = newConfig.users.filter(
      (newUser) =>
        !(oldConfig?.users ?? []).find((oldUser) => oldUser.key === newUser.key)
    );
    const deletedUsers = oldConfig
      ? oldConfig.users.filter(
          (oldUser) =>
            !newConfig.users.find((newUser) => oldUser.key === newUser.key)
        )
      : [];
    const updatedUsers = oldConfig
      ? newConfig.users.filter((newUser) => {
          const oldUser = oldConfig.users.find(
            (oldUser) => oldUser.key === newUser.key
          );
          if (!oldUser) return false;
          const sameConfig =
            JSON.stringify(oldUser) === JSON.stringify(newConfig);
          return !sameConfig;
        })
      : [];

    newUsers.forEach((newUser) =>
      this.eventEmitter.emit("new-user", newUser.key)
    );
    deletedUsers.forEach((deletedUser) =>
      this.eventEmitter.emit("delete-user", deletedUser.key)
    );
    updatedUsers.forEach((changedUser) =>
      this.eventEmitter.emit("update-user", changedUser.key)
    );
  }
}

@Module({
  imports: [EventModule],
  exports: [ConfigService],
})
export class ConfigModule {
  public static async register(file: string): Promise<DynamicModule> {
    const config = await ConfigService.readConfig(file);

    return {
      module: ConfigModule,
      providers: [
        {
          provide: ConfigService,
          inject: [MoxyEventEmitter],
          useFactory: (eventEmitter: MoxyEventEmitter) => {
            return new ConfigService(file, config.ttl, eventEmitter);
          },
        },
      ],
    };
  }
}
