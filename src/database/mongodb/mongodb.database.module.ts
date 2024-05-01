import mongoose from "mongoose";

import { MongoDBDatabase, StatsSchema } from "./mongodb.database";
import { IMongoDBDatabaseDriverConfig } from "../../config/config.dto";

export class MongoDBDatabaseModule {
  private constructor(private readonly mongoDBDatabase: MongoDBDatabase) {}

  public static create(
    config: IMongoDBDatabaseDriverConfig
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
