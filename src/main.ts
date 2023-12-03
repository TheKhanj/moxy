import * as rl from "node:readline/promises";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { ProxyStorage } from "./proxy/proxy.storage";
import { UserService } from "./user/user.service";
import { MemoryDatabase } from "./database/memory.database";
import { dateToString } from "./utils";

async function readStdin(db: MemoryDatabase) {
  const readline = rl.createInterface(process.stdin);
  readline.on("line", async (line) => {
    if (line === "query") {
      console.log(await db.get("test"));
    }
  });
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const userControl = app.get(UserService);
  const stats = await userControl.assert("test");
  stats.limit = 3_000;
  stats.expirationDate = dateToString(new Date(Date.now() + 100_000_000));
  await userControl.update("test", stats);

  const proxyStorage = app.get(ProxyStorage);

  proxyStorage.add("test", 3000, 4000);
  proxyStorage.add("test", 3001, 4001);

  const db = app.get(MemoryDatabase);
  readStdin(db);
}

bootstrap();
