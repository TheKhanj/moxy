import { Module } from "@nestjs/common";

import {
  UserController,
  UserExpirationDateController,
  UserPassthroughController,
  UserTrraficController,
} from "./user.controllers";
import { UserService } from "./user.service";
import { TrraficEventEmitterModule } from "../trrafic.event.emitter.module";

@Module({
  imports: [TrraficEventEmitterModule],
  exports: [UserService],
  controllers: [
    UserController,
    UserTrraficController,
    UserExpirationDateController,
    UserPassthroughController,
  ],
  providers: [UserService],
})
export class UserModule {}
