import {
  DynamicModule,
  Inject,
  Injectable,
  Logger,
  Module,
} from "@nestjs/common";

import { Database } from "./database/database";
import { stringToDate } from "./utils";
import { DatabaseMutex } from "./database/database.mutex";
import { DatabaseModule } from "./database/database.module";
import { DatabaseConfig, UserConfig } from "./config";
import { EventModule, TrafficEventEmitter } from "./event";

export type IUserStats = {
  key: string;
  up: number;
  down: number;
};

export class UserStats implements IUserStats {
  public constructor(
    public key: string,
    public up: number,
    public down: number
  ) {}

  public static create(from: IUserStats) {
    return new UserStats(from.key, from.up, from.down);
  }

  public get total() {
    return this.up + this.down;
  }

  public clone(): UserStats {
    return new UserStats(this.key, this.up, this.down);
  }

  public toObject(): IUserStats {
    return {
      key: this.key,
      up: this.up,
      down: this.down,
    };
  }
}

export class User {
  public constructor(
    private readonly getConfig: () => Promise<UserConfig>,
    private readonly getStats: () => Promise<UserStats>
  ) {}

  public async isEnabled() {
    const stats = await this.getStats();
    const config = await this.getConfig();

    if (!config.passthrough) return false;
    if (config.limit != "unlimit" && stats.total > config.limit) return false;
    if (
      config.expirationDate !== "unlimit" &&
      new Date().getTime() > stringToDate(config.expirationDate).getTime()
    )
      return false;
    return true;
  }
}

@Injectable()
export class UserStatsService {
  private readonly logger = new Logger("UserStatsService");

  public constructor(
    @Inject("Database")
    private readonly database: Database,
    private readonly eventEmitter: TrafficEventEmitter,
    @Inject("DatabaseMutex")
    private readonly mutex: DatabaseMutex
  ) {
    this.eventEmitter.addListener("traffic", (...args) =>
      this.handleNewTrafficEvent(...args)
    );
  }

  public get(userKey: string) {
    return this.database.get(userKey);
  }

  public async assert(userKey: string) {
    return this.database.get(userKey).catch(() => this.add(userKey));
  }

  public async add(userKey: string) {
    const stats = new UserStats(userKey, 0, 0);

    await this.database.set(userKey, stats);

    return stats.clone();
  }

  public async update(userKey: string, update: Partial<IUserStats>) {
    return this.withLock(
      userKey,
      async () => await this._update(userKey, update)
    );
  }

  private async _update(userKey: string, update: Partial<IUserStats>) {
    const stats = await this.database.get(userKey);

    Object.keys(update).forEach((key) => {
      const _k = key as keyof IUserStats;
      // TODO: WTF?
      stats[_k] = update[_k] as never;
    });

    await this.database.set(userKey, stats);
    return stats.clone();
  }

  private async handleNewTrafficEvent(
    type: "up" | "down",
    userKey: string,
    amount: number
  ) {
    await this.withLock(userKey, async () => {
      try {
        const stats = await this.get(userKey);
        const update: Partial<IUserStats> =
          type === "up"
            ? { up: stats.up + amount }
            : { down: stats.down + amount };
        await this._update(userKey, update);
      } catch (err) {
        this.logger.error(err instanceof Error ? err.message : err);
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

@Module({
  imports: [EventModule],
  exports: [UserStatsService],
  providers: [UserStatsService],
})
export class UserModule {
  public static register(databaseConfig: DatabaseConfig): DynamicModule {
    return {
      module: UserModule,
      imports: [DatabaseModule.register(databaseConfig)],
    };
  }
}
