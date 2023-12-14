import {
  DynamicModule,
  Inject,
  Injectable,
  Logger,
  Module,
  OnApplicationBootstrap,
} from "@nestjs/common";
import * as assert from "node:assert";
import { readFile } from "node:fs";
import { promisify } from "node:util";

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
  users: Record<string, UserConfig>;
};

@Injectable()
export class ConfigService {
  private cache?: Config;
  private oldCache?: Config;
  private readonly logger = new Logger("ConfigService");

  public constructor(
    private readonly file: string,
    private readonly eventEmitter: MoxyEventEmitter
  ) {}

  public static async readConfig(file: string): Promise<Config> {
    const content = await promisify(readFile)(file);
    const json = JSON.parse(content.toString());

    const parsed = ConfigSchema.parse(json);
    Object.keys(parsed.users).forEach((key) => {
      parsed.users[key].key = key;
    });
    return parsed;
  }

  public async getConfig(): Promise<Config> {
    if (this.cache) return this.cache;

    return this.refreshCache();
  }

  public async refreshCache(): Promise<Config> {
    this.oldCache = this.cache;
    this.cache = await ConfigService.readConfig(this.file);

    await this.emitChangeEvents(this.cache, this.oldCache);

    this.logger.log("Refreshed config cache");

    return this.cache;
  }

  private async emitChangeEvents(newConfig: Config, oldConfig?: Config) {
    const newUsersKeys = Object.keys(newConfig.users).filter((newUserKey) =>
      oldConfig ? !oldConfig.users[newUserKey] : true
    );
    const deletedUsersKeys = oldConfig
      ? Object.keys(oldConfig.users).filter(
          (oldUserKey) => !newConfig.users[oldUserKey]
        )
      : [];
    const updatedUsersKeys = oldConfig
      ? Object.keys(newConfig.users).filter((newUserKey) => {
          const oldUser = oldConfig.users[newUserKey];
          if (!oldUser) return false;
          const newUser = newConfig.users[newUserKey];
          const sameConfig =
            JSON.stringify(oldUser) === JSON.stringify(newUser);
          return !sameConfig;
        })
      : [];

    deletedUsersKeys.forEach((deletedUserKey) =>
      this.eventEmitter.emit("delete-user", deletedUserKey)
    );
    newUsersKeys.forEach((newUserKey) =>
      this.eventEmitter.emit("new-user", newConfig.users[newUserKey])
    );
    updatedUsersKeys.forEach((changedUserKey) => {
      assert.ok(oldConfig);
      this.eventEmitter.emit(
        "update-user",
        oldConfig.users[changedUserKey],
        newConfig.users[changedUserKey]
      );
    });
  }
}

@Module({
  imports: [EventModule],
  exports: [ConfigService],
})
export class ConfigModule implements OnApplicationBootstrap {
  private readonly logger = new Logger("ConfigModule");

  public constructor(
    private readonly configService: ConfigService,
    @Inject("CacheTtl")
    private readonly ttl: number
  ) {}

  onApplicationBootstrap() {
    this.configService.refreshCache().catch((err) => this.logger.error(err));

    setInterval(() => {
      this.configService.refreshCache().catch((err) => this.logger.error(err));
    }, this.ttl);
  }

  public static async register(file: string): Promise<DynamicModule> {
    const config = await ConfigService.readConfig(file);

    return {
      module: ConfigModule,
      providers: [
        { provide: "CacheTtl", useValue: config.ttl },
        {
          provide: ConfigService,
          inject: [MoxyEventEmitter],
          useFactory: (eventEmitter: MoxyEventEmitter) => {
            return new ConfigService(file, eventEmitter);
          },
        },
      ],
    };
  }
}
