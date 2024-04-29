import * as assert from "node:assert";
import { before, describe, it } from "node:test";

import { testDatabase } from "../../test/test.database";
import { MemoryDatabase } from "./memory.database";

describe("MemoryDatabase", () => {
  let db: MemoryDatabase;

  before(async () => {
    db = new MemoryDatabase();
  });

  it("database should be defined", () => {
    assert.ok(db);
  });

  it("should pass general tests", async () => {
    await testDatabase(db);
  });
});
