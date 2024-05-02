import {
  IApiConfig,
  IConfig,
  IDatabaseConfig,
  IUserConfig,
} from "./config.dto";
import { UserNotFoundError } from "../errors";

export class Config implements IConfig {
  public readonly api: IApiConfig;
  public readonly pidFile: string;
  public readonly database: IDatabaseConfig;
  public readonly users: Record<string, IUserConfig>;

  public constructor(config: IConfig) {
    this.api = config.api;
    this.pidFile = config.pidFile;
    this.database = config.database;
    this.users = config.users;
  }

  public getUser(userKey: string): IUserConfig {
    const userConfig = this.users[userKey];
    if (!userConfig) throw new UserNotFoundError(userKey);
    return userConfig;
  }
}
