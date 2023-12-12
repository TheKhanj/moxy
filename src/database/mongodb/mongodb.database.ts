import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { Stats } from "../../stats";
import { Database } from "../database";
import { StatsModel } from "./mongodb.schema";

@Injectable()
export class MongoDbDatabase implements Database {
  public constructor(
    @InjectModel(StatsModel.name)
    private readonly model: Model<StatsModel>,
  ) {}

  public async get(key: string): Promise<Stats> {
    const doc = await this.model.findOne({
      key,
    });

    if (!doc) throw new Error(`user ${key} not found`);

    return Stats.create(doc.toObject());
  }

  public async set(key: string, stats: Stats): Promise<void> {
    const res = await this.model.findOneAndReplace({ key }, stats).exec();
    if (!res) await this.model.create(stats.clone());
  }
}
