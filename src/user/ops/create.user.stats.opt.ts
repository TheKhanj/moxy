import { Database } from "../../database/database";
import { UserStats } from "../../database/user.stats";

export class CreateUserStatsOpt {
  public constructor(private readonly database: Database) {}

  public async execute(userKey: string) {
    await this.database.set(userKey, 0, 0);

    return new UserStats(userKey, 0, 0);
  }
}
