import { Mutex } from "async-mutex";
import * as assert from "node:assert";
import { describe, it } from "node:test";

import { Config } from "./config";
import { IConfig } from "./config.dto";
import { ConfigEventEmitter } from "./config.event";
import { ConfigService, parseConfig } from "./config.service";

describe("ConfigService", () => {
  it("should reload config", async () => {
    let changedConfig = false;

    const readConfig = async (): Promise<Config> => {
      const config = parseConfig({
        users: {
          "user-1": {
            limit: 0,
            proxy: {
              protocol: "tcp",
              listeningPort: 3000,
              forwardingPort: 4000,
            },
          },
        },
      });

      if (!changedConfig) return new Config(config);

      config.users["user-1"].limit = 100;

      return new Config(config);
    };
    const writeConfig = async (config: IConfig) => {};

    const eventEmitter = new ConfigEventEmitter();

    const service = new ConfigService(eventEmitter, readConfig, writeConfig);

    const mutex = new Mutex();
    mutex.acquire();

    eventEmitter.on("update-user", (prev, curr) => {
      assert.strictEqual(prev.key, "user-1");
      assert.strictEqual(prev.limit, 0);
      assert.strictEqual(curr.key, "user-1");
      assert.strictEqual(curr.limit, 100);
      mutex.release();
    });

    await service.get();
    changedConfig = true;
    await service.reloadCache();
    await service.get();

    // wait for all events to emit
    await mutex.acquire();
  });
});
