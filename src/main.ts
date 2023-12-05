import * as rl from "node:readline/promises";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { ProxyStorage } from "./proxy/proxy.storage";
import { UserService } from "./user/user.service";
import { MemoryDatabase } from "./database/memory/memory.database";

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
  await userControl.update("test", stats).catch((err) => {
    console.log(err.stack);
    throw err;
  });

  const proxyStorage = app.get(ProxyStorage);

  proxyStorage.add("test", 3000, 4000);
  proxyStorage.add("test", 3001, 4001);

  const db = app.get('Database');
  readStdin(db);
}

bootstrap();
