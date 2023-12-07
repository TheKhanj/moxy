import EventEmitter from "node:events";
import { Inject, Injectable, Logger } from "@nestjs/common";

import { Database } from "../database/database";
import { TrafficEvent } from "../event/traffic.event";
import { DatabaseMutex } from "../database/database.mutex";
import { TRAFFIC_EVENT_EMITTER } from "../traffic.event.emitter.module";
import { dateToString, stringToDate } from "../utils";
import { IStats, NO_EXPIRATION_DATE, Stats, UNLIMIT_TRAFFIC } from "../stats";

const logger = new Logger("UserControlService");

@Injectable()
export class UserService {
  public constructor(
    @Inject("Database")
    private readonly database: Database,
    @Inject(TRAFFIC_EVENT_EMITTER)
    private readonly eventEmitter: EventEmitter,
    @Inject("DatabaseMutex")
    private readonly mutex: DatabaseMutex
  ) {
    this.eventEmitter.addListener(TrafficEvent.eventName, (ev) =>
      this.handleNewTrafficEvent(ev)
    );
  }

  public get(userKey: string) {
    return this.database.get(userKey);
  }

  public async assert(userKey: string) {
    return this.database.get(userKey).catch(() => this.add(userKey));
  }

  public async add(userKey: string) {
    const stats = new Stats(
      userKey,
      0,
      0,
      UNLIMIT_TRAFFIC,
      NO_EXPIRATION_DATE,
      true
    );

    await this.database.set(userKey, stats);

    return stats.clone();
  }

  public async update(userKey: string, update: Partial<IStats>) {
    return this.withLock(
      userKey,
      async () => await this._update(userKey, update)
    );
  }

  public addTraffic(userKey: string, limit: number) {
    return this.withLock(userKey, async () => {
      const user = await this.database.get(userKey);
      user.limit += limit;
      await this.database.set(userKey, user);
    });
  }

  public togglePassthrough(userKey: string) {
    return this.withLock(userKey, async () => {
      const user = await this.database.get(userKey);
      user.passthrough = !user.passthrough;
      await this.database.set(userKey, user);
    });
  }

  public addExpirationDate(userKey: string, expirationDate: number) {
    return this.withLock(userKey, async () => {
      const user = await this.database.get(userKey);
      const date = stringToDate(user.expirationDate);
      const newDate = new Date(date.getTime() + expirationDate);
      user.expirationDate = dateToString(newDate);
      await this.database.set(userKey, user);
    });
  }

  private async _update(userKey: string, update: Partial<IStats>) {
    const stats = await this.database.get(userKey);

    Object.keys(update).forEach((key) => {
      const _k = key as keyof IStats;
      // TODO: WTF?
      stats[_k] = update[_k] as never;
    });

    await this.database.set(userKey, stats);
    return stats.clone();
  }

  private async handleNewTrafficEvent(ev: TrafficEvent) {
    await this.withLock(ev.userKey, async () => {
      try {
        const stats = await this.get(ev.userKey);
        const update: Partial<IStats> =
          ev.type === "up"
            ? { up: stats.up + ev.amount }
            : { down: stats.down + ev.amount };
        await this._update(ev.userKey, update);
      } catch (err) {
        logger.error(err instanceof Error ? err.message : err);
      }
    });
  }

  private withLock<T>(userKey: string, fn: () => Promise<T>) {
    return this.mutex
      .acquire(userKey)
      .then(fn)
      .finally(() => this.mutex.release(userKey));
  }
}
