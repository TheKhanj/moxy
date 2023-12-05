import { Injectable } from "@nestjs/common";

import { Database } from "./database";
import { IStats, Stats } from "../stats";
import { DatabaseMutex } from "./database.mutex";

function preferAppChanges<T extends keyof IStats>(
  key: T,
  cached: IStats,
  patch: IStats,
  database: IStats
): IStats[T] {
  const appChanged = patch[key] !== cached[key];
  const dbChanged = database[key] !== cached[key];
  if (appChanged && dbChanged) return patch[key];
  if (appChanged) return patch[key];
  if (dbChanged) return database[key];
  return cached[key];
}

function applyPatches(to: Stats, patch?: Stats, cache?: Stats) {
  if (!patch) return to;
  const c = !!cache ? cache : to.clone();

  to.up += patch.up - c.up;
  to.down += patch.down - c.down;
  to.limit = preferAppChanges("limit", c, patch, to);
  to.expirationDate = preferAppChanges("expirationDate", c, patch, to);
  to.passthrough = preferAppChanges("passthrough", c, patch, to);
  return to;
}

@Injectable()
export class PatcherDatabase implements Database {
  private readonly cache: Record<string, Stats | Error | undefined> = {};
  private readonly patches: Record<string, Stats | undefined> = {};

  public constructor(
    private readonly origin: Database,
    private readonly mutex: DatabaseMutex
  ) {}

  public async get(key: string): Promise<Stats> {
    const c = this.cache[key];
    const cache = c ? c : await this.origin.get(key).catch((err: Error) => err);
    const patch = this.patches[key];
    this.cache[key] = cache;

    if (cache instanceof Error) {
      if (!patch) throw cache;
      return patch;
    }

    const ret = applyPatches(cache.clone(), patch);
    return ret;
  }

  public async set(key: string, stats: Stats): Promise<void> {
    this.patches[key] = stats.clone();
  }

  public async flush() {
    return Promise.allSettled(
      Object.keys(this.patches).map((key) =>
        this.flushKey(key, this.patches[key] as Stats)
      )
    );
  }

  private async flushKey(key: string, patch: Stats) {
    const cache = this.cache[key];

    await this.mutex
      .acquire(key)
      .then(async () => {
        const database = await this.origin.get(key).catch((err: Error) => err);
        if (database instanceof Error) return this.origin.set(key, patch);

        const newStats = applyPatches(
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
