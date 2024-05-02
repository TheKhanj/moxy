import { Logger } from "../../logger";
import { IUserConfig } from "../../config/config.dto";
import { ProxyStorage } from "../../proxy/proxy.storage";

export class EnableUserOpt {
  private readonly logger = new Logger("EnableUserOpt");

  public constructor(private readonly proxyStorage: ProxyStorage) {}

  public async execute(userConfig: IUserConfig) {
    await this.proxyStorage.add(userConfig.key, userConfig.proxy);
    this.logger.info(`Enabled user ${userConfig.key}`);
  }
}
