import { Model, Schema } from "mongoose";

import { Database } from "../database";
import { UserStats } from "../user.stats";
import { UserNotFoundError } from "../../errors";

export const StatsSchema = new Schema({
  key: String,
  up: Number,
  down: Number,
});

class StatsModel {
  key?: string | null;
  up?: number | null;
  down?: number | null;
}

export class MongoDBDatabase implements Database {
  public constructor(private readonly model: Model<StatsModel>) {}

  public async get(key: string): Promise<UserStats> {
    const doc = await this.model.findOne({
      key,
    });

    if (!doc) throw new UserNotFoundError(key);

    return UserStats.create(doc.toObject());
  }

  public async inc(key: string, up: number, down: number): Promise<void> {
    await this.model.findOneAndUpdate(
      { key },
      {
        $inc: {
          up,
          down,
        },
      }
    );
  }

  public async set(key: string, up: number, down: number): Promise<void> {
    const res = await this.model
      .findOneAndReplace({ key }, { key, up, down })
      .exec();
    if (!res) await this.model.create({ key, up, down });
  }
}
