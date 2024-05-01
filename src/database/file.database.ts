import * as fs from "fs";
import * as fsp from "fs/promises";
import { Mutex } from "async-mutex";
import { promisify } from "util";

import { Database } from "./database";
import { UserNotFoundError } from "../errors";
import { IUserStats, UserStats } from "./user.stats";

type FileContent = IUserStats[];

export class FileDatabase implements Database {
  private readonly mutex = new Mutex();

  public constructor(private readonly filePath: string) {}

  public async get(key: string): Promise<UserStats> {
    const all = await this.getAll();
    const found = all.find((stats) => stats.key === key);

    if (!found) throw new UserNotFoundError(key);

    return UserStats.create(found);
  }

  public async inc(key: string, up: number, down: number): Promise<void> {
    const all = await this.getAll();
    const found = all.find((stats) => stats.key === key);

    if (!found) return this.set(key, up, down);

    found.up += up;
    found.down += down;
    await this.write(all);
  }

  public async set(key: string, up: number, down: number): Promise<void> {
    const all = await this.getAll();
    const found = all.find((stats) => stats.key === key);

    if (!found) all.push({ key, up, down });
    else {
      found.up = up;
      found.down = down;
    }

    await this.write(all);
  }

  private async write(content: FileContent) {
    const release = await this.mutex.acquire();
    await fsp
      .writeFile(this.filePath, JSON.stringify(content, null, 2))
      .finally(() => release());
  }

  private async getAll(): Promise<FileContent> {
    await this.assertFile();
    const buffer = await fsp.readFile(this.filePath);
    return JSON.parse(buffer.toString());
  }

  private async assertFile() {
    const e = promisify(fs.exists);
    if (await e(this.filePath)) return;
    await fsp.writeFile(this.filePath, "[]");
  }
}
