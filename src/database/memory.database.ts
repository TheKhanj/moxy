import { Database } from "./database";
import { UserStats } from "../user/user.stats";
import { UserNotFoundError } from "../errors";

export class MemoryDatabase implements Database {
  private readonly cache: Record<string, UserStats> = {};

  public async get(key: string): Promise<UserStats> {
    const ret = this.cache[key];

    if (!ret) throw new UserNotFoundError(key);

    return ret.clone();
  }

  public async inc(key: string, stats: UserStats): Promise<void> {
    const ret = this.cache[key];

    if (!ret) throw new UserNotFoundError(key);

    ret.up += stats.up;
    ret.down += stats.down;
  }

  public async set(key: string, stats: UserStats): Promise<void> {
    this.cache[key] = stats.clone();
  }
}
