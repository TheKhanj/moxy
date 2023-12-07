import { Module } from "@nestjs/common";

import {
  UserController,
  UserExpirationDateController,
  UserPassthroughController,
  UserTrafficController,
} from "./user.controllers";
import { UserService } from "./user.service";
import { TrafficEventEmitterModule } from "../traffic.event.emitter.module";

@Module({
  imports: [TrafficEventEmitterModule],
  exports: [UserService],
  controllers: [
    UserController,
    UserTrafficController,
    UserExpirationDateController,
    UserPassthroughController,
  ],
  providers: [UserService],
})
export class UserModule {}
