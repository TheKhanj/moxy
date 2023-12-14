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
import { EventModule, MoxyEventEmitter } from "./event";
import { ConfigService, DatabaseConfig, UserConfig } from "./config";

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
    public readonly config: UserConfig,
    public readonly stats: UserStats
  ) {}

  public isEnabled() {
    if (!this.config.passthrough) return false;
    if (this.config.limit != "unlimit" && this.stats.total > this.config.limit)
      return false;
    if (
      this.config.expirationDate !== "unlimit" &&
      new Date().getTime() > stringToDate(this.config.expirationDate).getTime()
    )
      return false;
    return true;
  }
}

@Injectable()
export class UserStatsService {
  public constructor(
    @Inject("Database")
    private readonly database: Database,
    @Inject("DatabaseMutex")
    private readonly mutex: DatabaseMutex
  ) {}

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
      async () => await this.updateWithNoLock(userKey, update)
    );
  }

  public async updateWithNoLock(userKey: string, update: Partial<IUserStats>) {
    const stats = await this.database.get(userKey);

    Object.keys(update).forEach((key) => {
      const _k = key as keyof IUserStats;
      // TODO: WTF?
      stats[_k] = update[_k] as never;
    });

    await this.database.set(userKey, stats);
    return stats.clone();
  }

  private withLock<T>(userKey: string, fn: () => Promise<T>) {
    return this.mutex
      .acquire(userKey)
      .then(fn)
      .finally(() => this.mutex.release(userKey));
  }
}

@Injectable()
export class UserFactory {
  public constructor(
    private readonly configService: ConfigService,
    private readonly statsService: UserStatsService
  ) {}

  public async getFromUserConfig(userConfig: UserConfig) {
    const stats = await this.statsService.get(userConfig.key);

    return new User(userConfig, stats);
  }

  public async get(userKey: string): Promise<User> {
    const config = await this.configService.getConfig();
    const userConfig = config.users[userKey];
    if (!userConfig) throw new Error(`no config found for user ${userKey}`);

    return this.getFromUserConfig(userConfig);
  }
}

@Injectable()
export class UserWatcher {
  private readonly logger = new Logger("UserWatcher");
  private readonly lastStatus: Record<string, boolean> = {};

  public constructor(
    private readonly eventEmitter: MoxyEventEmitter,
    private readonly userFactory: UserFactory,
    @Inject("DatabaseMutex")
    private readonly mutex: DatabaseMutex,
    private readonly userStats: UserStatsService
  ) {
    this.eventEmitter.on("new-user", (user) =>
      this.handleNewUser(user).catch((err) => this.logger.error(err))
    );
    this.eventEmitter.on("update-user", ({ key: userKey }) =>
      this.handleUserUpdate(userKey).catch((err) => this.logger.error(err))
    );
    // TODO: add reset traffic event here
    this.eventEmitter.on("traffic", (...args) =>
      this.handleNewTraffic(...args).catch((err) => this.logger.error(err))
    );
    this.eventEmitter.on("disable-user", (userKey) => {
      this.logger.log(`User ${userKey} disabled`);
    });
    this.eventEmitter.on("enable-user", (userKey) => {
      this.logger.log(`User ${userKey} enabled`);
    });
  }

  private async handleNewUser(userConfig: UserConfig) {
    await this.userStats.assert(userConfig.key);
    const user = await this.userFactory.get(userConfig.key);
    this.lastStatus[userConfig.key] = user.isEnabled();
  }

  private async handleUserUpdate(userKey: string) {
    await this.userStats.assert(userKey);
    const user = await this.userFactory.get(userKey);
    const wasDisabled = !this.lastStatus[userKey];

    if (wasDisabled && user.isEnabled())
      this.eventEmitter.emit("enable-user", userKey);

    this.lastStatus[userKey] = user.isEnabled();
  }

  private async handleNewTraffic(
    type: "up" | "down",
    userKey: string,
    amount: number
  ) {
    await this.withLock(userKey, async () => {
      try {
        const stats = await this.userStats.get(userKey);
        const update: Partial<IUserStats> =
          type === "up"
            ? { up: stats.up + amount }
            : { down: stats.down + amount };
        await this.userStats.updateWithNoLock(userKey, update);
      } catch (err) {
        this.logger.error(err);
      }
    });

    await this.userStats.assert(userKey);
    const user = await this.userFactory.get(userKey);
    const wasEnabled = this.lastStatus[userKey];

    if (wasEnabled && !user.isEnabled())
      this.eventEmitter.emit("disable-user", userKey);

    this.lastStatus[userKey] = user.isEnabled();
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
  exports: [UserStatsService, UserFactory],
  providers: [UserStatsService, UserFactory, UserWatcher],
})
export class UserModule {
  public static register(
    configModule: DynamicModule,
    databaseConfig: DatabaseConfig
  ): DynamicModule {
    return {
      module: UserModule,
      imports: [configModule, DatabaseModule.register(databaseConfig)],
    };
  }
}
