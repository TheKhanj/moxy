import mongoose from "mongoose";

import { MongoDBDatabaseDriverConfig } from "../../config/config.dto";
import { MongoDBDatabase, StatsSchema } from "./mongodb.database";

export class MongoDBDatabaseModule {
  private constructor(private readonly mongoDBDatabase: MongoDBDatabase) {}

  public static create(
    config: MongoDBDatabaseDriverConfig
  ): MongoDBDatabaseModule {
    mongoose.connect(config.url, {
      dbName: config.databaseName,
    });
    const StatsModel = mongoose.model("Stats", StatsSchema);

    const mongoDBDatabase = new MongoDBDatabase(StatsModel);

    return new MongoDBDatabaseModule(mongoDBDatabase);
  }

  public get(key: "mongodb-database"): MongoDBDatabase {
    return this.mongoDBDatabase;
  }
}
