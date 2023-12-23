#!/usr/bin/env node
import { z } from "zod";
import minimist from "minimist";
import { NestFactory } from "@nestjs/core";
import { DynamicModule, Module } from "@nestjs/common";

import { UserModule } from "./user";
import { ProxyModule } from "./proxy";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule, ConfigService } from "./config";
import { readFileSync } from "node:fs";

@Module({})
export class AppModule {
  public static async register(configPath: string): Promise<DynamicModule> {
    const configModule = await ConfigModule.register(configPath);
    const config = await ConfigService.readConfig(configPath);
    const userModule = UserModule.register(configModule, config.database);
    return {
      module: AppModule,
      imports: [
        configModule,
        userModule,
        DatabaseModule.register(config.database),
        ProxyModule.register(configModule, userModule),
      ],
    };
  }
}

type UserId = {
  type: "remark" | "key";
  id: string;
};

async function createUser() {}

async function getUser(id: UserId) {}

async function getAllUsers() {}

async function deleteUser(id: UserId) {}

async function resetTraffic(id: UserId) {}

async function addTraffic(id: UserId, amount: string) {}

async function setTraffic(id: UserId, amount: string) {}

async function setExpirationDate(id: UserId, date: string) {}

async function addExpirationDate(id: UserId, amount: string) {}

async function enablePassthrough(id: UserId) {}

async function disablePassthrough(id: UserId) {}

async function runDaemon(config: string) {
  const daemon = await NestFactory.createApplicationContext(
    AppModule.register(config)
  );

  await daemon.init();
}

export async function main() {
  const argv = minimist(process.argv, {
    boolean: ["version", "v"],
  });

  if (argv.v || argv.version) showVersion();

  const parts = process.argv.slice(2);
  switch (parts[0]) {
    case "user":
      break;
    case "run":
      const schema = z.object({
        config: z.string().default("moxy.json"),
      });
      const parsed = parseSchema(schema, {
        config: argv.config ?? argv.c,
      });

      await runDaemon(parsed.config);
      break;
    default:
      help();
  }
}

function parseSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: any
): z.output<T> {
  const res = schema.safeParse(data);

  if (!res.success) help();

  return res.data;
}

function showVersion() {
  const { version } = JSON.parse(readFileSync("package.json").toString());
  console.log(`Version: ${version}`);
  process.exit(1);
}

function help(): never {
  console.error(
    `NAME:
    moxy - Distributed transparent proxy with traffic control facilities

USAGE:
    user create
    user get [-k key] [-r remark]
    user get-all
    user delete [-k key] [-r remark]

    user traffic reset [-k key] [-r remark]
    user traffic add 50G [-k key] [-r remark]
    user traffic set 50G [-k key] [-r remark]

    user expiration-date set 2025-01-01
    user expiration-date add 1 month

    user passthrough (enable|disable|toggle)

    run [-c moxy.json]`
  );
  process.exit(1);
}

main();
