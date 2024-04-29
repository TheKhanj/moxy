import * as assert from "node:assert";
import { before, describe, it } from "node:test";

import { testDatabase } from "../../../test/test.database";
import { MongoDBDatabase } from "./mongodb.database";
import { MongoDBDatabaseModule } from "./mongodb.database.module";

describe("MongoDBDatabase", () => {
  let db: MongoDBDatabase;

  before(async () => {
    const m = MongoDBDatabaseModule.create({
      type: "mongodb",
      databaseName: "moxy-test",
      url: "mongodb://root:password@127.0.0.1:27017",
    });

    db = m.get("mongodb-database");
  });

  it("database should be defined", () => {
    assert.ok(db);
  });

  it("should pass general tests", async () => {
    await testDatabase(db);
  });
});
