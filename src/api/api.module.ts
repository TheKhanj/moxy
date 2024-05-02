import fastify from "fastify";

import { Logger } from "../logger";
import { UserModule } from "../user/user.module";
import { IApiConfig } from "../config/config.dto";
import { ConfigModule } from "../config/config.module";
import { ApiUserService } from "./api.user.service";
import { DatabaseModule } from "../database/database.module";
import { ApiUserController } from "./api.user.controller";

export class ApiModule {
  private constructor(
    private readonly listen: (() => void) | null,
    private readonly stopServer: (() => Promise<void>) | null
  ) {}

  public static create(
    config: IApiConfig,
    configModule: ConfigModule,
    databaseModule: DatabaseModule,
    userModule: UserModule
  ) {
    if (!config.enabled) return new ApiModule(null, null);

    const router = fastify();
    const userService = new ApiUserService(
      configModule.get("config-service"),
      databaseModule.get("database"),
      userModule.get("get-user-opt")
    );
    const userController = new ApiUserController(userService);
    userController.register(router);

    const logger = new Logger("ApiModule");

    const listen = () =>
      router.listen(
        {
          host: config.host,
          port: config.port,
        },
        (err) => {
          if (err) throw err;
          logger.info(`Started api server on port ${config.port}`);
        }
      );

    const stop = () => router.close();

    return new ApiModule(listen, stop);
  }

  public async start() {
    if (this.listen) this.listen();
  }

  public async stop() {
    if (this.stopServer) await this.stopServer();
  }
}
