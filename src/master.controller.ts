import { Logger } from "./logger";
import { Database } from "./database/database";
import { GetUserOpt } from "./user/ops/get.user.opt";
import { IUserConfig } from "./config/config.dto";
import { ProxyStorage } from "./proxy/proxy.storage";
import { withErrorLogging } from "./utils";
import { ProxyEventEmitter } from "./proxy/proxy.event";
import { ConfigEventEmitter } from "./config/config.event";
import { AssertUserStatsOpt } from "./user/ops/assert.user.stats.opt";

export class MasterController {
  private readonly logger = new Logger("MasterController");

  public constructor(
    configEventEmitter: ConfigEventEmitter,
    proxyEventEmitter: ProxyEventEmitter,
    private readonly database: Database,
    private readonly getUserOpt: GetUserOpt,
    private readonly assertUserStatsOpt: AssertUserStatsOpt,
    private readonly proxyStorage: ProxyStorage
  ) {
    this.registerConfigEventHandlers(configEventEmitter);
    this.registerProxyEventHandlers(proxyEventEmitter);
  }

  private async handleNewUserConfig(userConfig: IUserConfig) {
    await this.assertUserStatsOpt.execute(userConfig.key);

    if (this.proxyStorage.exists(userConfig.key)) {
      this.logger.debug(
        `Failed adding user's proxy, proxy already exists! ${userConfig.key}`
      );
      return;
    }

    await this.recheckUser(userConfig.key);
  }

  private async handleDeleteUserConfig(userConfig: IUserConfig) {
    if (this.proxyStorage.exists(userConfig.key)) {
      this.logger.debug(
        `Failed removing users' proxy, proxy does not exist! ${userConfig.key}`
      );
      return;
    }

    await this.recheckUser(userConfig.key);
  }

  private async handleUpdateUserConfig(userConfig: IUserConfig) {
    await this.recheckUser(userConfig.key);
  }

  private async recheckUser(userKey: string) {
    const user = await this.getUserOpt.execute(userKey);
    const proxyExists = this.proxyStorage.exists(userKey);

    if (proxyExists && !user.isEnabled()) await this.disableUser(userKey);
    else if (!proxyExists && user.isEnabled())
      await this.enableUser(user.config);
  }

  private async enableUser(userConfig: IUserConfig) {
    await this.proxyStorage.add(userConfig.key, userConfig.proxy);
    this.logger.info(`Enabled user ${userConfig.key}`);
  }

  private async disableUser(userKey: string) {
    await this.proxyStorage.delete(userKey);
    this.logger.info(`Disabled user ${userKey}`);
  }

  private registerConfigEventHandlers(ev: ConfigEventEmitter) {
    const logger = new Logger("ConfigEventHandler");
    ev.on("new-user", (userConfig) =>
      withErrorLogging(() => this.handleNewUserConfig(userConfig), logger)
    );
    ev.on("delete-user", (userConfig) =>
      withErrorLogging(() => this.handleDeleteUserConfig(userConfig), logger)
    );
    ev.on("update-user", (_, newConfig) =>
      withErrorLogging(() => this.handleUpdateUserConfig(newConfig), logger)
    );

    logger.info("Registered config event handlers");
  }

  private async handleNewTraffic(
    type: "up" | "down",
    userKey: string,
    amount: number
  ) {
    await this.database.inc(
      userKey,
      type === "up" ? amount : 0,
      type === "down" ? amount : 0
    );
    await this.recheckUser(userKey);
  }

  private registerProxyEventHandlers(ev: ProxyEventEmitter) {
    const logger = new Logger("TrafficEventHandler");
    ev.on("traffic", (type, userKey, amount) => {
      withErrorLogging(
        () => this.handleNewTraffic(type, userKey, amount),
        logger
      );
    });

    logger.info("Registered traffic event handlers");
  }
}
