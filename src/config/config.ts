import { UserNotFoundError } from "../errors";
import { IConfig, IDatabaseConfig, IUserConfig } from "./config.dto";

export class Config implements IConfig {
  public readonly pidFile: string;
  public readonly database: IDatabaseConfig;
  public readonly users: Record<string, IUserConfig>;

  public constructor(config: IConfig) {
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
