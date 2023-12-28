import * as fsp from "fs/promises";
import * as assert from "node:assert";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  Database,
  FileDatabase,
  MemoryDatabase,
  PatcherDatabase,
} from "../../src/database/database";
import { UserStats } from "../../src/user";

async function testDatabase(db: Database | PatcherDatabase) {
  const key = randomUUID();

  await db.set(
    key,
    UserStats.create({
      up: 0,
      down: 0,
      key,
    })
  );

  assert.doesNotReject(() => db.get(key));

  const stats = await db.get(key);

  async function testUpdate(update: Partial<UserStats>, flush: boolean) {
    const cloned = stats.clone();
    cloned.up = update.up ?? cloned.up;
    cloned.down = update.down ?? cloned.down;
    await db.set(key, cloned.clone());

    if (flush && db instanceof PatcherDatabase) await db.flush();

    const retreived = await db.get(key);

    assert.strictEqual(retreived.up, cloned.up);
    assert.strictEqual(retreived.down, cloned.down);
  }

  await testUpdate({ up: 123 }, true);
  await testUpdate({ down: 123 }, false);
  await testUpdate({ up: 1234, down: 1234 }, false);
  await testUpdate({ up: 1, down: 1 }, true);
  await testUpdate({ up: 900 }, false);
}

describe("Database", () => {
  it("should test PatcherDatabase", async () => {
    await testDatabase(new PatcherDatabase(new MemoryDatabase()));
  });

  it("should test MemoryDatabase", async () => {
    await testDatabase(new MemoryDatabase());
  });

  it("should test FileDatabase", async () => {
    const path = `/tmp/file.database.test.${randomUUID()}.json`;

    await testDatabase(new FileDatabase(path));
    await fsp.rm(path).catch(() => {});
  });
});
