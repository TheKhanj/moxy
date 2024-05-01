#!/usr/bin/env node
import { z } from "zod";
import minimist from "minimist";
import { kill } from "node:process";
import * as fsp from "node:fs/promises";
import path, { dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import { AppModule } from "./app.module";
import { readConfigFile } from "./config/config.service";

async function runDaemon(config: string) {
  const appModule = await AppModule.create(config);
  await appModule.start();
}

async function sendSignal(config: string, signal: "reload") {
  const c = await readConfigFile(config)();

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
