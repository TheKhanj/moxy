#!/usr/bin/env node
import { z } from "zod";
import minimist from "minimist";
import { kill } from "node:process";
import * as fsp from "node:fs/promises";
import { NestFactory } from "@nestjs/core";
import path, { dirname } from "node:path";
import { DynamicModule, Module } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";

import { UserModule } from "./user";
import { ProxyModule } from "./proxy";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule, ConfigService } from "./config";

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

async function runDaemon(config: string) {
  const daemon = await NestFactory.createApplicationContext(
    AppModule.register(config)
  );

  await daemon.init();
}

async function sendSignal(config: string, signal: "reload") {
  const c = await ConfigService.readConfig(config);

  const content = await fsp.readFile(c.pidFile);
  const pid = +content.toString();
  kill(pid, "SIGHUP");
}

export async function main() {
  const argv = minimist(process.argv, {
    boolean: ["version", "v"],
  });

  if (argv.v || argv.version) showVersion();

  const schema = z.object({
    config: z.string().default("moxy.json"),
    signal: z.literal("reload").optional(),
  });

  const parsed = parseSchema(schema, {
    config: argv.config ?? argv.c,
    signal: argv.signal ?? argv.s,
  });

  if (parsed.signal) return sendSignal(parsed.config, parsed.signal);

  await runDaemon(parsed.config);
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
  let dir = __filename;
  while (dir && !existsSync(path.join(dir, "package.json"))) dir = dirname(dir);

  const filePath = path.join(dir, "package.json");
  const { version } = JSON.parse(readFileSync(filePath).toString());
  console.log(`Version: ${version}`);
  process.exit(1);
}

function help(): never {
  console.error(
    `NAME:
    moxy - Distributed transparent proxy with traffic control facilities

USAGE:
    [-c moxy.json] [-s reload]`
  );

  process.exit(1);
}

main();
