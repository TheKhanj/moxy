import { Module } from "@nestjs/common";

import { UserModule } from "../user/user.module";
import { ProxyStorage } from "./proxy.storage";
import { TrraficEventEmitterModule } from "../trrafic.event.emitter.module";

@Module({
  imports: [TrraficEventEmitterModule, UserModule],
  providers: [ProxyStorage],
})
export class ProxyModule {}
