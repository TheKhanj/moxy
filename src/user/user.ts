import { UserStats } from "../database/user.stats";
import { IUserConfig } from "../config/config.dto";
import { stringToDate } from "../utils";

export class User {
  public constructor(
    public readonly config: IUserConfig,
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
