import { Logger } from "../logger";
import { Database } from "./database";
import { FileDatabase } from "./file.database";
import { MemoryDatabase } from "./memory.database";
import { PatcherDatabase } from "./patcher.database";
import { IDatabaseConfig } from "../config/config.dto";
import { MongoDBDatabaseModule } from "./mongodb/mongodb.database.module";

const logger = new Logger("Database");

export class DatabaseModule {
  private constructor(
    private readonly database: Database,
    private readonly patcher: PatcherDatabase,
    private readonly flushInterval: number
  ) {}

  private static create(config: IDatabaseConfig) {
    const driver = config.driver;

    let database: Database;
    switch (driver.type) {
      case "mongodb":
        const mongoModule = MongoDBDatabaseModule.create(driver);
        database = mongoModule.get("mongodb-database");
        break;
      case "memory":
        database = new MemoryDatabase();
        break;
      case "file":
        database = new FileDatabase(driver.path);
    }

    const patcher = new PatcherDatabase(database);
    return new DatabaseModule(database, patcher, config.flush);
  }

  public get(key: "database"): Database {
    return this.database;
  }

  private interval: NodeJS.Timeout;

  public start() {
    this.interval = setInterval(() => {
      this.patcher.flush().then((results) => {
        logger.info("Flushed entities");
        const failedCount = results
          .filter((result) => result.status === "rejected")
          .reduce((prev) => prev + 1, 0);

        if (failedCount) logger.err(`Failed flushing ${failedCount} entities`);
      });
    }, this.flushInterval);
  }

  public stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
