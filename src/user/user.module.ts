import { Database } from "../database/database";
import { GetUserOpt } from "./ops/get.user.opt";
import { ConfigService } from "../config/config.service";
import { AssertUserStatsOpt } from "./ops/assert.user.stats.opt";
import { CreateUserStatsOpt } from "./ops/create.user.stats.opt";

export class UserModule {
  private constructor(
    private readonly getUserOpt: GetUserOpt,
    private readonly assertUserStatsOpt: AssertUserStatsOpt,
    private readonly createUserStatsOpt: CreateUserStatsOpt
  ) {}

  public static create(
    database: Database,
    configService: ConfigService
  ): UserModule {
    const getUserOpt = new GetUserOpt(database, configService);
    const createUserStatsOpt = new CreateUserStatsOpt(database);
    const assertUserStatsOpt = new AssertUserStatsOpt(
      database,
      createUserStatsOpt
    );

    return new UserModule(getUserOpt, assertUserStatsOpt, createUserStatsOpt);
  }

  public get(key: "get-user-opt"): GetUserOpt;
  public get(key: "assert-user-stats-opt"): AssertUserStatsOpt;
  public get(key: "create-user-stats"): CreateUserStatsOpt;
  public get(key: string): unknown {
    switch (key) {
      case "get-user-opt":
        return this.getUserOpt;
      case "assert-user-stats-opt":
        return this.assertUserStatsOpt;
      case "create-user-stats":
        return this.createUserStatsOpt;
      default:
        throw new Error("Unreachable code");
    }
  }
}
