import { Mutex } from "async-mutex";
import { Injectable } from "@nestjs/common";

export interface DatabaseMutex {
  acquire(key: string): Promise<void>;
  release(key: string): Promise<void>;
}

@Injectable()
export class LocalDatabaseMutex implements DatabaseMutex {
  private readonly acquiring: Record<string, number> = {};
  private readonly mutexes: Record<string, Mutex> = {};

  public async acquire(userKey: string): Promise<void> {
    let m = this.mutexes[userKey];
    if (!m) m = this.allocateMutex(userKey);

    this.acquiring[userKey] = (this.acquiring[userKey] ?? 0) + 1;

    await m.acquire();
  }

  public async release(userKey: string): Promise<void> {
    const m = this.mutexes[userKey];

    this.acquiring[userKey]--;
    if (!this.acquiring[userKey]) this.deallocateMutex(userKey);

    m.release();
  }

  private allocateMutex(userKey: string) {
    this.mutexes[userKey] = new Mutex();
    return this.mutexes[userKey];
  }

  private deallocateMutex(userKey: string) {
    delete this.mutexes[userKey];
  }
}
