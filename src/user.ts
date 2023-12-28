import {
  DynamicModule,
  Inject,
  Injectable,
  Logger,
  Module,
} from "@nestjs/common";

import { Database } from "./database/database";
import { stringToDate } from "./utils";
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
    private readonly database: Database
  ) {}

  public get(userKey: string) {
    return this.database.get(userKey);
  }

  public async assert(userKey: string) {
    return this.database.get(userKey).catch(() => this.create(userKey));
  }

  public async create(userKey: string) {
    const stats = new UserStats(userKey, 0, 0);

    await this.database.set(userKey, stats);

    return stats.clone();
  }

  public async set(userKey: string, stats: IUserStats) {
    await this.database.set(userKey, UserStats.create(stats));
  }

  public async inc(userKey: string, stats: IUserStats) {
    await this.database.inc(userKey, UserStats.create(stats));
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
    private readonly userStats: UserStatsService
  ) {
    this.eventEmitter.on("new-user", (user) =>
      this.handleNewUser(user).catch((err) => this.logger.error(err))
    );
    this.eventEmitter.on("update-user", ({ key: userKey }) =>
      this.handleUserUpdate(userKey).catch((err) => this.logger.error(err))
    );
    this.eventEmitter.on("delete-user", (userKey) => {
      delete this.lastStatus[userKey];
      if (!!this.lastStatus[userKey])
        this.eventEmitter.emit("disable-user", userKey);
    });
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
    if (user.isEnabled()) this.eventEmitter.emit("enable-user", userConfig.key);
  }

  private async handleUserUpdate(userKey: string) {
    await this.userStats.assert(userKey);
    const user = await this.userFactory.get(userKey);
    const wasDisabled = !this.lastStatus[userKey];

    if (wasDisabled && user.isEnabled())
      this.eventEmitter.emit("enable-user", userKey);

    if (!wasDisabled && !user.isEnabled())
      this.eventEmitter.emit("disable-user", userKey);

    this.lastStatus[userKey] = user.isEnabled();
  }

  private async handleNewTraffic(
    type: "up" | "down",
    userKey: string,
    amount: number
  ) {
    await this.userStats.assert(userKey);

    const update: IUserStats = { key: userKey, up: 0, down: 0 };
    update[type] = amount;

    await this.userStats.inc(userKey, update);
    const user = await this.userFactory.get(userKey);
    const wasEnabled = this.lastStatus[userKey];

    if (wasEnabled && !user.isEnabled())
      this.eventEmitter.emit("disable-user", userKey);

    this.lastStatus[userKey] = user.isEnabled();
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
