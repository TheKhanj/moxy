import { Database } from "./database";
import { UserNotFoundError } from "../errors";
import { IUserStats, UserStats } from "./user.stats";

export class MemoryDatabase implements Database {
  private readonly cache: Record<string, IUserStats> = {};

  public async get(key: string): Promise<UserStats> {
    const ret = this.cache[key];

    if (!ret) throw new UserNotFoundError(key);

    return UserStats.create(ret);
  }

  public async inc(key: string, up: number, down: number): Promise<void> {
    const ret = this.cache[key];

    if (!ret) throw new UserNotFoundError(key);

    ret.up += up;
    ret.down += down;
  }

  public async set(key: string, up: number, down: number): Promise<void> {
    this.cache[key] = { key, up, down };
  }
}
