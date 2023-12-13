import { Inject, Injectable } from "@nestjs/common";

import { UserStats } from "../user";
import { DatabaseMutex } from "./database.mutex";

export interface Database {
  get(key: string): Promise<UserStats>;
  set(key: string, stats: UserStats): Promise<void>;
}

@Injectable()
export class MemoryDatabase implements Database {
  private readonly cache: Record<string, UserStats> = {};

  public async get(key: string): Promise<UserStats> {
    const ret = this.cache[key];

    if (!ret) throw new Error(`User ${key} not found`);

    return ret.clone();
  }

  public async set(key: string, stats: UserStats): Promise<void> {
    this.cache[key] = stats.clone();
  }
}

@Injectable()
export class PatcherDatabase implements Database {
  private readonly cache: Record<string, UserStats | Error | undefined> = {};
  private readonly patches: Record<string, UserStats | undefined> = {};

  private static applyPatches(
    to: UserStats,
    patch?: UserStats,
    cache?: UserStats
  ) {
    if (!patch) return to;
    const c = !!cache ? cache : to.clone();

    to.up += patch.up - c.up;
    to.down += patch.down - c.down;
    return to;
  }

  public constructor(
    @Inject("InternalDatabase")
    private readonly origin: Database,
    @Inject("DatabaseMutex")
    private readonly mutex: DatabaseMutex
  ) {}

  public async get(key: string): Promise<UserStats> {
    const c = this.cache[key];
    const cache = c ? c : await this.origin.get(key).catch((err: Error) => err);
    const patch = this.patches[key];
    this.cache[key] = cache;

    if (cache instanceof Error) {
      if (!patch) throw cache;
      return patch;
    }

    const ret = PatcherDatabase.applyPatches(cache.clone(), patch);
    return ret;
  }

  public async set(key: string, stats: UserStats): Promise<void> {
    this.patches[key] = stats.clone();
  }

  public async flush() {
    return Promise.allSettled(
      Object.keys(this.patches).map((key) =>
        this.flushKey(key, this.patches[key] as UserStats)
      )
    );
  }

  private async flushKey(key: string, patch: UserStats) {
    const cache = this.cache[key];

    await this.mutex
      .acquire(key)
      .then(async () => {
        const database = await this.origin.get(key).catch((err: Error) => err);
        if (database instanceof Error) return this.origin.set(key, patch);

        const newStats = PatcherDatabase.applyPatches(
          database.clone(),
          patch,
          cache instanceof Error ? undefined : cache
        );
        await this.origin.set(key, newStats);
      })
      .finally(async () => {
        await this.mutex.release(key);

        delete this.patches[key];
        delete this.cache[key];
      });
  }
}
