import * as assert from "node:assert";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { UserStats } from "../../src/user";
import { LocalDatabaseMutex } from "../../src/database/database.mutex";
import { MemoryDatabase, PatcherDatabase } from "../../src/database/database";

describe("PatcherDatabase", () => {
  const key = randomUUID();
  let db: PatcherDatabase;

  before(async () => {
    db = new PatcherDatabase(new MemoryDatabase(), new LocalDatabaseMutex());

    await db.set(
      key,
      UserStats.create({
        up: 0,
        down: 0,
        key,
      })
    );

    await db.flush();
  });

  it("should set and flush multiple times", async () => {
    const stats = await db.get(key);

    async function testUpdate(update: Partial<UserStats>) {
      const cloned = stats.clone();
      cloned.up = update.up ?? cloned.up;
      cloned.down = update.down ?? cloned.down;
      await db.set(key, cloned.clone());
      await db.flush();

      const retreived = await db.get(key);

      assert.ok(retreived.up === cloned.up);
      assert.ok(retreived.down === cloned.down);
    }

    await testUpdate({ up: 123 });
    await testUpdate({ down: 123 });
    await testUpdate({ up: 1234, down: 1234 });
    await testUpdate({ up: 1, down: 1 });
    await testUpdate({ up: 900 });
  });
});
