import { Inject, Injectable, Logger } from "@nestjs/common";

import { UserStats } from "../user";
import { UserNotFoundError } from "../errors";

export interface Database {
  get(key: string): Promise<UserStats>;
  inc(key: string, stats: UserStats): Promise<void>;
  set(key: string, stats: UserStats): Promise<void>;
}

@Injectable()
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

type Patch = {
  type: "inc" | "set";
  stats: UserStats;
};

@Injectable()
export class PatcherDatabase implements Database {
  private readonly logger = new Logger("CachedDatabase");
  private readonly cache: Record<string, UserStats | Error | undefined> = {};
  private readonly patches: Record<string, Patch[] | undefined> = {};

  public constructor(
    @Inject("InternalDatabase")
    private readonly origin: Database
  ) {}

  public async get(key: string): Promise<UserStats> {
    const cache = this.cache[key];
    const patches = this.patches[key];

    let ret: Error | UserStats;

    if (cache) ret = cache;
    else ret = await this.origin.get(key).catch((err: Error) => err);

    this.cache[key] = ret;
    return this.giveValue(key, ret, patches);
  }

  public async inc(key: string, stats: UserStats): Promise<void> {
    this.pushPatch(key, {
      type: "inc",
      stats: stats.clone(),
    });
  }

  public async set(key: string, stats: UserStats): Promise<void> {
    this.pushPatch(key, {
      type: "set",
      stats: stats.clone(),
    });
  }

  public flush() {
    return Promise.allSettled(
      Object.keys(this.patches).map((key) => {
        const patches = this.patches[key] as Patch[];

        return this.flushKey(key, patches);
      })
    );
  }

  private async flushKey(key: string, patches: Patch[]) {
    const zero = UserStats.create({
      key,
      up: 0,
      down: 0,
    });

    let accumulated = zero.clone();

    for (const patch of patches) {
      switch (patch.type) {
        case "inc":
          accumulated.down += patch.stats.down;
          accumulated.up += patch.stats.up;
          break;
        case "set":
          accumulated = zero.clone();
          await this.origin.set(key, patch.stats);
          break;
        default:
          throw new Error("Unreachable code");
      }
    }

    await this.origin.inc(key, accumulated);

    delete this.patches[key];
    delete this.cache[key];

    this.logger.log(`${patches.length} patches flushed for user ${key}`);
  }

  private pushPatch(key: string, patch: Patch) {
    const arr = this.patches[key] ?? [];

    arr.push(patch);

    this.patches[key] = arr;
  }

  private giveValue(key: string, stats: UserStats | Error, patches?: Patch[]) {
    if (stats instanceof Error && !patches) throw stats;
    const start =
      stats instanceof Error
        ? UserStats.create({ key, up: 0, down: 0 })
        : stats;

    return this.accumulate(start.clone(), patches ?? []);
  }

  private accumulate(stats: UserStats, patches: Patch[]) {
    for (const patch of patches) {
      switch (patch.type) {
        case "inc":
          stats.up += patch.stats.up;
          stats.down += patch.stats.down;
          break;
        case "set":
          stats.up = patch.stats.up;
          stats.down = patch.stats.down;
          break;
        default:
          throw new Error("Unreachable code");
      }
    }
    return stats;
  }
}
