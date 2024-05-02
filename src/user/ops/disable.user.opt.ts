import { Logger } from "../../logger";
import { ProxyStorage } from "../../proxy/proxy.storage";

export class DisableUserOpt {
  private readonly logger = new Logger("DisableUserOpt");

  public constructor(private readonly proxyStorage: ProxyStorage) {}

  public async execute(userKey: string) {
    await this.proxyStorage.delete(userKey);
    this.logger.info(`Disabled user ${userKey}`);
  }
}
