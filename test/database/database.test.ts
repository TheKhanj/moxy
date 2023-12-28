import * as assert from "node:assert";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { UserStats } from "../../src/user";
import { MemoryDatabase, PatcherDatabase } from "../../src/database/database";

describe("PatcherDatabase", () => {
  const key = randomUUID();
  let db: PatcherDatabase;

  before(async () => {
    db = new PatcherDatabase(new MemoryDatabase());
  });

  it("should set and flush multiple times", async () => {
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

      if (flush) await db.flush();

      const retreived = await db.get(key);

      assert.strictEqual(retreived.up, cloned.up);
      assert.strictEqual(retreived.down, cloned.down);
    }

    await testUpdate({ up: 123 }, true);
    await testUpdate({ down: 123 }, false);
    await testUpdate({ up: 1234, down: 1234 }, false);
    await testUpdate({ up: 1, down: 1 }, true);
    await testUpdate({ up: 900 }, false);
  });
});
