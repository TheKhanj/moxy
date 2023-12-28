import {
  InjectModel,
  MongooseModule,
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DynamicModule, Injectable, Module } from "@nestjs/common";

import { Database } from "./database";
import { UserNotFoundError } from "../errors";
import { IUserStats, UserStats } from "../user";
import { MongoDbDatabaseDriverConfig } from "../config";

@Schema({ collection: "stats", versionKey: false })
class StatsModel implements IUserStats {
  @Prop({ type: String })
  key: string;
  @Prop({ type: Number })
  up: number;
  @Prop({ type: Number })
  down: number;
}

const StatsSchema = SchemaFactory.createForClass(StatsModel);

@Injectable()
export class MongoDbDatabase implements Database {
  public constructor(
    @InjectModel(StatsModel.name)
    private readonly model: Model<StatsModel>
  ) {}

  public async get(key: string): Promise<UserStats> {
    const doc = await this.model.findOne({
      key,
    });

    if (!doc) throw new UserNotFoundError(key);

    return UserStats.create(doc.toObject());
  }

  public async inc(key: string, stats: UserStats): Promise<void> {
    await this.model.findOneAndUpdate(
      { key },
      {
        $inc: {
          down: stats.down,
          up: stats.up,
        },
      }
    );
  }

  public async set(key: string, stats: UserStats): Promise<void> {
    const res = await this.model.findOneAndReplace({ key }, stats).exec();
    if (!res) await this.model.create(stats.clone());
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: StatsModel.name,
        schema: StatsSchema,
      },
    ]),
  ],
  exports: ["InternalDatabase"],
  providers: [
    MongoDbDatabase,
    {
      provide: "InternalDatabase",
      useExisting: MongoDbDatabase,
    },
  ],
})
export class MongoDbDatabaseModule {
  public static register(config: MongoDbDatabaseDriverConfig): DynamicModule {
    return {
      module: MongoDbDatabaseModule,
      imports: [
        MongooseModule.forRoot(config.url, {
          dbName: config.databaseName,
        }),
      ],
    };
  }
}
