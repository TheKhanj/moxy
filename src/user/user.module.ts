import { Module } from "@nestjs/common";

import { UserService } from "./user.service";
import { TrraficEventEmitterModule } from "../trrafic.event.emitter.module";

@Module({
  imports: [TrraficEventEmitterModule],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
