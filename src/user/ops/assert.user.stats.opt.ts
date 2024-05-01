import { Database } from "../../database/database";
import { CreateUserStatsOpt } from "./create.user.stats.opt";

export class AssertUserStatsOpt {
  public constructor(
    private readonly database: Database,
    private readonly createUserStats: CreateUserStatsOpt
  ) {}

  public async execute(userKey: string) {
    return this.database
      .get(userKey)
      .catch(() => this.createUserStats.execute(userKey));
  }
}
