import { ConfigEventEmitter } from "./config.event";
import { ConfigService, readConfigFile } from "./config.service";

export class ConfigModule {
  private constructor(
    private readonly eventEmitter: ConfigEventEmitter,
    private readonly configService: ConfigService
  ) {}

  public static create(file: string): ConfigModule {
    const eventEmitter = new ConfigEventEmitter();
    (global as any).test1 = eventEmitter;
    const readConfig = readConfigFile(file);
    const configService = new ConfigService(eventEmitter, readConfig);

    return new ConfigModule(eventEmitter, configService);
  }

  public get(key: "config-event-emitter"): ConfigEventEmitter;
  public get(key: "config-service"): ConfigService;
  public get(key: string): unknown {
    switch (key) {
      case "config-event-emitter":
        return this.eventEmitter;
      case "config-service":
        return this.configService;
      default:
        throw new Error("Unreachable code");
    }
  }
}
