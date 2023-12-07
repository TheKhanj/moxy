import { Module } from "@nestjs/common";

import { UserModule } from "../user/user.module";
import { ProxyStorage } from "./proxy.storage";
import { TrafficEventEmitterModule } from "../traffic.event.emitter.module";

@Module({
  imports: [TrafficEventEmitterModule, UserModule],
  providers: [ProxyStorage],
})
export class ProxyModule {}
