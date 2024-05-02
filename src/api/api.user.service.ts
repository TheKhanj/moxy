import { Database } from "../database/database";
import { IUserStats } from "../database/user.stats";
import { GetUserOpt } from "../user/ops/get.user.opt";
import { IUserConfig } from "../config/config.dto";
import { ConfigService } from "../config/config.service";

export class ApiUserService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly database: Database,
    private readonly getUserOpt: GetUserOpt
  ) {}

  public async queryUsers(offset?: number, limit?: number) {
    const c = await this.configService.get();
    const usersKeys = Object.keys(c.users);

    const o = offset ?? 0;
    const l = limit ?? usersKeys.length - o;

    const keys = usersKeys.slice(o, l);

    const users = await Promise.all(
      keys.map((key) => this.getUserOpt.execute(key))
    );

    return users;
  }

  public async getUser(userKey: string) {
    return this.getUserOpt.execute(userKey);
  }

  public async updateUserStats(stats: IUserStats) {
    await this.database.set(stats.key, stats.up, stats.down);
  }

  public async updateUserConfig(userConfig: IUserConfig) {
    await this.configService.updateUserConfig(userConfig);
  }
}
