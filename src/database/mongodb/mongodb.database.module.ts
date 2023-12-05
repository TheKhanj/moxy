import { MongooseModule } from "@nestjs/mongoose";
import { DynamicModule, Module } from "@nestjs/common";

import { MongoDbDatabase } from "./mongodb.database";
import { StatsModel, StatsSchema } from "./mongodb.schema";

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
  public static register(dbUri: string): DynamicModule {
    return {
      module: MongoDbDatabaseModule,
      imports: [
        MongooseModule.forRoot(dbUri, {
          dbName: "moxy",
        }),
      ],
    };
  }
}
