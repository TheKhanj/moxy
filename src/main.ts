import { NestFactory } from "@nestjs/core";
import { DynamicModule, Module } from "@nestjs/common";

import { Config } from "./config";
import { UserModule } from "./user";
import { ProxyModule } from "./proxy";
import { DatabaseModule } from "./database/database.module";

@Module({})
export class AppModule {
  public static register(config: Config): DynamicModule {
    return {
      module: AppModule,
      imports: [
        UserModule.register(config.database),
        DatabaseModule.register(config.database),
        ProxyModule.register(config.proxy, config.database),
      ],
    };
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  await app.init();
}

bootstrap();
