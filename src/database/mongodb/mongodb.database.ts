import { Model } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { Database } from "../database";
import { UserNotFoundError } from "../../errors";
import { IUserStats, UserStats } from "../user.stats";

@Schema({ collection: "stats", versionKey: false })
class StatsModel implements IUserStats {
  @Prop({ type: String })
  key: string;
  @Prop({ type: Number })
  up: number;
  @Prop({ type: Number })
  down: number;
}

export const StatsSchema = SchemaFactory.createForClass(StatsModel);

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
