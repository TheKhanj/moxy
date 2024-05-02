import { GetUserOpt } from "./ops/get.user.opt";
import { ProxyModule } from "../proxy/proxy.module";
import { ConfigModule } from "../config/config.module";
import { EnableUserOpt } from "./ops/enable.user.opt";
import { RecheckUserOpt } from "./ops/recheck.user.opt";
import { DisableUserOpt } from "./ops/disable.user.opt";
import { DatabaseModule } from "../database/database.module";
import { AssertUserStatsOpt } from "./ops/assert.user.stats.opt";
import { CreateUserStatsOpt } from "./ops/create.user.stats.opt";

export class UserModule {
  private constructor(
    private readonly getUserOpt: GetUserOpt,
    private readonly recheckUserOpt: RecheckUserOpt,
    private readonly assertUserStatsOpt: AssertUserStatsOpt,
    private readonly createUserStatsOpt: CreateUserStatsOpt
  ) {}

  public static create(
    databaseModule: DatabaseModule,
    configModule: ConfigModule,
    proxyModule: ProxyModule
  ): UserModule {
    const getUserOpt = new GetUserOpt(
      databaseModule.get("database"),
      configModule.get("config-service")
    );
    const createUserStatsOpt = new CreateUserStatsOpt(
      databaseModule.get("database")
    );
    const assertUserStatsOpt = new AssertUserStatsOpt(
      databaseModule.get("database"),
      createUserStatsOpt
    );
    const disableUserOpt = new DisableUserOpt(proxyModule.get("proxy-storage"));
    const enableUserOpt = new EnableUserOpt(proxyModule.get("proxy-storage"));
    const recheckUserOpt = new RecheckUserOpt(
      getUserOpt,
      proxyModule.get("proxy-storage"),
      disableUserOpt,
      enableUserOpt
    );

    return new UserModule(
      getUserOpt,
      recheckUserOpt,
      assertUserStatsOpt,
      createUserStatsOpt
    );
  }

  public get(key: "get-user-opt"): GetUserOpt;
  public get(key: "recheck-user-opt"): RecheckUserOpt;
  public get(key: "assert-user-stats-opt"): AssertUserStatsOpt;
  public get(key: "create-user-stats-opt"): CreateUserStatsOpt;
  public get(key: string): unknown {
    switch (key) {
      case "get-user-opt":
        return this.getUserOpt;
      case "recheck-user-opt":
        return this.recheckUserOpt;
      case "assert-user-stats-opt":
        return this.assertUserStatsOpt;
      case "create-user-stats-opt":
        return this.createUserStatsOpt;
      default:
        throw new Error("Unreachable code");
    }
  }
}
