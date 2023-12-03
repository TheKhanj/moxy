import { Module } from "@nestjs/common";

import { UserModule } from "./user/user.module";
import { ProxyModule } from "./proxy/proxy.module";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    ProxyModule,
    UserModule,
    DatabaseModule.register(true),
  ],
})
export class AppModule {}
