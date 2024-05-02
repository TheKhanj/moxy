import { GetUserOpt } from "./get.user.opt";
import { ProxyStorage } from "../../proxy/proxy.storage";
import { EnableUserOpt } from "./enable.user.opt";
import { DisableUserOpt } from "./disable.user.opt";

export class RecheckUserOpt {
  public constructor(
    private readonly getUserOpt: GetUserOpt,
    private readonly proxyStorage: ProxyStorage,
    private readonly disableUserOpt: DisableUserOpt,
    private readonly enableUserOpt: EnableUserOpt
  ) {}

  public async execute(userKey: string) {
    const user = await this.getUserOpt.execute(userKey);
    const proxyExists = this.proxyStorage.exists(userKey);

    if (proxyExists && !user.isEnabled())
      await this.disableUserOpt.execute(userKey);
    else if (!proxyExists && user.isEnabled())
      await this.enableUserOpt.execute(user.config);
  }
}
