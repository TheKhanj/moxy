import * as fsp from "fs/promises";
import * as assert from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { FileDatabase } from "./file.database";
import { testDatabase } from "../../test/test.database";

describe("FileDatabase", () => {
  let db: FileDatabase;
  const dbPath = `/tmp/file.database.test.${randomUUID()}.json`;

  before(async () => {
    db = new FileDatabase(dbPath);
  });

  after(async () => {
    await fsp.rm(dbPath).catch(() => {});
  });

  it("database should be defined", () => {
    assert.ok(db);
  });

  it("should pass general tests", async () => {
    await testDatabase(db);
  });
});
