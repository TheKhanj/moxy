import EventEmitter from "node:events";
import { Inject, Injectable, Logger } from "@nestjs/common";

import { Database } from "../database/database";
import { DATABASE } from "../database/database.module";
import { dateToString } from "../utils";
import { TrraficEvent } from "../event/trrafic.event";
import { IStats, Stats } from "../stats";
import { TRRAFIC_EVENT_EMITTER } from "../trrafic.event.emitter.module";

const logger = new Logger("UserControlService");

@Injectable()
export class UserService {
  public constructor(
    @Inject(DATABASE)
    private readonly database: Database,
    @Inject(TRRAFIC_EVENT_EMITTER)
    private readonly eventEmitter: EventEmitter
  ) {
    this.eventEmitter.addListener(TrraficEvent.eventName, (ev) =>
      this.handleNewTrraficEvent(ev)
    );
  }

  public get(userKey: string) {
    return this.database.get(userKey);
  }

  public async assert(userKey: string) {
    return this.database.get(userKey).catch(() => this.add(userKey));
  }

  public async add(userKey: string) {
    const stats = new Stats(userKey, 0, 0, 0, dateToString(new Date()), true);

    await this.database.set(userKey, stats);

    return stats.clone();
  }

  public async update(userKey: string, update: Partial<IStats>) {
    const stats = await this.database.get(userKey);

    Object.keys(update).forEach((key) => {
      const _k = key as keyof IStats;
      // TODO: WTF?
      stats[_k] = update[_k] as never;
    });

    await this.database.set(userKey, stats);
    return stats.clone();
  }

  private async handleNewTrraficEvent(ev: TrraficEvent) {
    try {
      const stats = await this.get(ev.userKey);
      const update: Partial<IStats> =
        ev.type === "up"
          ? {
              up: stats.up + ev.amount,
            }
          : {
              down: stats.down + ev.amount,
            };
      await this.update(ev.userKey, update);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : err);
    }
  }
}
