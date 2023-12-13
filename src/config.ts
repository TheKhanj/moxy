import { readFile } from "node:fs";
import { promisify } from "node:util";
import { ConfigSchema } from "./config.schema";

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
  proxy: ProxyConfig;
  database: DatabaseConfig;
  users: UserConfig[];
};

export class ConfigService {
  private cache?: Config;
  public constructor(private readonly file: string, cacheTtl: number) {
    setInterval(() => {
      delete this["cache"];
    }, cacheTtl);
  }

  public async getConfig(): Promise<Config> {
    if (this.cache) return this.cache;

    const content = await promisify(readFile)(this.file);
    const json = JSON.parse(content.toString());

    this.cache = ConfigSchema.parse(json);
    return this.cache;
  }
}
