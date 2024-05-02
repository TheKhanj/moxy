import { ApiModule } from "./api/api.module";
import { UserModule } from "./user/user.module";
import { ProxyModule } from "./proxy/proxy.module";
import { ConfigModule } from "./config/config.module";
import { readConfigFile } from "./config/config.service";
import { DatabaseModule } from "./database/database.module";
import { MasterController } from "./master.controller";

export class AppModule {
  private constructor(
    private readonly configModule: ConfigModule,
    private readonly databaseModule: DatabaseModule,
    private readonly userModule: UserModule,
    private readonly proxyModule: ProxyModule,
    private readonly apiModule: ApiModule,
    private readonly masterController: MasterController
  ) {}

  public static async create(configPath: string) {
    const config = await readConfigFile(configPath)();
    const configModule = ConfigModule.create(configPath);
    const databaseModule = DatabaseModule.create(config.database);
    const userModule = UserModule.create(
      databaseModule.get("database"),
      configModule.get("config-service")
    );
    const proxyModule = ProxyModule.create();

    const masterController = new MasterController(
      configModule.get("config-event-emitter"),
      proxyModule.get("proxy-event-emitter"),
      databaseModule.get("database"),
      userModule.get("get-user-opt"),
      userModule.get("assert-user-stats-opt"),
      proxyModule.get("proxy-storage")
    );

    const apiModule = ApiModule.create(
      config.api,
      configModule,
      databaseModule,
      userModule
    );

    return new AppModule(
      configModule,
      databaseModule,
      userModule,
      proxyModule,
      apiModule,
      masterController
    );
  }

  public get(key: "config-module"): ConfigModule;
  public get(key: "database-module"): DatabaseModule;
  public get(key: "user-module"): UserModule;
  public get(key: "proxy-module"): ProxyModule;
  public get(key: "master-controller"): MasterController;
  public get(key: string): unknown {
    switch (key) {
      case "config-module":
        return this.configModule;
      case "database-module":
        return this.databaseModule;
      case "user-module":
        return this.userModule;
      case "proxy-module":
        return this.proxyModule;
      case "api-module":
        return this.apiModule;
      case "master-controller":
        return this.masterController;
      default:
        throw new Error("Unreachable code");
    }
  }

  public async start() {
    this.databaseModule.start();
    await this.configModule.start();
    await this.apiModule.start();
  }

  public async stop() {
    this.databaseModule.stop();
    await this.apiModule.stop();
  }
}
