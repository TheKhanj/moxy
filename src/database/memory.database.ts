import { Injectable } from "@nestjs/common";

import { Stats } from "../stats";
import { Database } from "./database";

@Injectable()
export class MemoryDatabase implements Database {
  private readonly cache: Record<string, Stats> = {};

  public async get(key: string): Promise<Stats> {
    const ret = this.cache[key];

    if (!ret) throw new Error("not found");

    return ret.clone();
  }

  public async set(key: string, stats: Stats): Promise<void> {
    this.cache[key] = stats.clone();
  }
}
