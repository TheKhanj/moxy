import { DynamicModule, Inject, Logger } from "@nestjs/common";

import { MongoDbDatabaseModule } from "./mongodb.database";
import { DatabaseConfig, DatabaseDriverConfig } from "../config";

const logger = new Logger("Database");

export class DatabaseModule {
  public constructor(
    @Inject("Database")
    private readonly patcher: PatcherDatabase,
    @Inject("FlushInterval")
    private readonly flushInterval: number
  ) {}

  private static getDriver(config: DatabaseDriverConfig): DynamicModule {
    switch (config.type) {
      case "mongodb":
        return {
          module: DatabaseModule,
          imports: [MongoDbDatabaseModule.register(config)],
        };
      case "memory":
        return {
          module: DatabaseModule,
          providers: [
            {
              provide: "InternalDatabase",
              useClass: MemoryDatabase,
            },
          ],
        };
      case "file":
        return {
          module: DatabaseModule,
          providers: [
            {
              provide: "InternalDatabase",
              useFactory: () => new FileDatabase(config.path),
            },
          ],
        };
    }
  }

  public static register(config: DatabaseConfig): DynamicModule {
    const driver = this.getDriver(config.driver);

    return {
      module: DatabaseModule,
      imports: [...(driver.imports ?? [])],
      providers: [
        ...(driver.providers ?? []),
        {
          provide: "FlushInterval",
          useValue: config.flush,
        },
      ],
    };
  }

  private interval: NodeJS.Timeout;

  public onApplicationBootstrap() {
    this.interval = setInterval(() => {
      this.patcher.flush().then((results) => {
        logger.log("Flushed entities");
        const failedCount = results
          .filter((result) => result.status === "rejected")
          .reduce((prev) => prev + 1, 0);

        if (failedCount)
          logger.error(`Failed flushing ${failedCount} entities`);
      });
    }, this.flushInterval);
  }

  public onApplicationShutdown() {
    if (this.interval) clearInterval(this.interval);
  }
}
