import * as assert from "node:assert";
import { before, describe, it } from "node:test";

import { testDatabase } from "../../test/test.database";
import { PatcherDatabase } from "./patcher.database";
import { MemoryDatabase } from "./memory.database";

describe("PatcherDatabase", () => {
  let db: PatcherDatabase;

  before(async () => {
    db = new PatcherDatabase(new MemoryDatabase());
  });

  it("database should be defined", () => {
    assert.ok(db);
  });

  it("should pass general tests", async () => {
    await testDatabase(db);
  });
});
