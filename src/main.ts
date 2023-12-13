import { NestFactory } from "@nestjs/core";
import { DynamicModule, Module } from "@nestjs/common";

import { UserModule } from "./user";
import { ProxyModule } from "./proxy";
import { DatabaseModule } from "./database/database.module";
import { Config, ConfigModule, ConfigService } from "./config";

@Module({})
export class AppModule {
  public static async register(
    configPath: string,
    config: Config
  ): Promise<DynamicModule> {
    const configModule = await ConfigModule.register(configPath);
    const userModule = UserModule.register(configModule, config.database);
    return {
      module: AppModule,
      imports: [
        configModule,
        userModule,
        DatabaseModule.register(config.database),
        ProxyModule.register(config.proxy, configModule, userModule),
      ],
    };
  }
}

async function bootstrap(configPath: string) {
  const config = await ConfigService.readConfig(configPath);
  const app = await NestFactory.createApplicationContext(
    await AppModule.register(configPath, config)
  );

  await app.init();
}

bootstrap("config.json");
