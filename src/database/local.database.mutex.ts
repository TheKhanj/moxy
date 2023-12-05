import { Mutex } from "async-mutex";
import { Injectable } from "@nestjs/common";

import { DatabaseMutex } from "./database.mutex";

@Injectable()
export class LocalDatabaseMutex implements DatabaseMutex {
  private readonly acquiring: Record<string, number> = {};
  private readonly mutexes: Record<string, Mutex> = {};

  public async acquire(key: string): Promise<void> {
    let m = this.mutexes[key];
    if (!m) m = this.allocateMutex(key);

    this.acquiring[key]++;

    await m.acquire();
  }

  public async release(key: string): Promise<void> {
    const m = this.mutexes[key];

    this.acquiring[key]--;
    if (!this.acquiring[key]) this.deallocateMutex(key);

    m.release();
  }

  private allocateMutex(key: string) {
    this.mutexes[key] = new Mutex();
    return this.mutexes[key];
  }

  private deallocateMutex(key: string) {
    delete this.mutexes[key];
  }
}
