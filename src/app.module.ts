import { Module } from "@nestjs/common";

import { UserModule } from "./user/user.module";
import { ProxyModule } from "./proxy/proxy.module";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    ProxyModule,
    UserModule,
    DatabaseModule.register({
      type: "mongodb",
      dbUri: "mongodb://root:password@127.0.0.1:27017",
      mutex: "local",
      flushInterval: 1_000
    }),
  ],
})
export class AppModule {}
