import { User } from "../user";
import { Database } from "../../database/database";
import { ConfigService } from "../../config/config.service";

export class GetUserOpt {
  public constructor(
    private readonly database: Database,
    private readonly configService: ConfigService
  ) {}

  public async execute(userKey: string) {
    const config = await this.configService.get();
    const userConfig = config.getUser(userKey);
    const stats = await this.database.get(userKey);

    return new User(userConfig, stats);
  }
}
