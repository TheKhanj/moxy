import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  NotImplementedException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";

import { Database } from "./database";
import { DatabaseMutex } from "./database.mutex";
import { PatcherDatabase } from "./patcher.database";
import { LocalDatabaseMutex } from "./local.database.mutex";
import { MemoryDatabaseModule } from "./memory/memory.database.module";
import { MongoDbDatabaseModule } from "./mongodb/mongodb.database.module";

const logger = new Logger("Database");

@Global()
@Module({
  exports: ['Database', "DatabaseMutex"],
  providers: [
    {
      provide: 'Database',
      inject: ["InternalDatabase", "DatabaseMutex"],
      useFactory: (internal: Database, mutex: DatabaseMutex) => {
        return new PatcherDatabase(internal, mutex);
      },
    },
  ],
})
export class DatabaseModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  public constructor(
    @Inject("Database")
    private readonly patcher: PatcherDatabase,
    @Inject("FlushInterval")
    private readonly flushInterval: number
  ) {}

  public static register(
    params: (
      | {
          type: "memory";
        }
      | {
          type: "mongodb";
          dbUri: string;
        }
    ) & {
      mutex: "local";
      flushInterval: number;
    }
  ): DynamicModule {
    return {
      module: DatabaseModule,
      imports:
        params.type === "memory"
          ? [MemoryDatabaseModule]
          : params.type === "mongodb"
          ? [MongoDbDatabaseModule.register(params.dbUri)]
          : [],
      providers: [
        {
          provide: "FlushInterval",
          useValue: params.flushInterval,
        },
        {
          provide: "DatabaseMutex",
          useFactory: () => {
            if (params.mutex === "local") return new LocalDatabaseMutex();
            throw new NotImplementedException();
          },
        },
      ],
    };
  }

  private interval: NodeJS.Timeout;

  public onApplicationBootstrap() {
    this.interval = setInterval(() => {
      this.patcher.flush().then((results) => {
        logger.log("Flushing entities");
        const failedCount = results
          .filter((result) => result.status === "rejected")
          .reduce((prev) => prev + 1, 0);

        if (failedCount)
          logger.error(`Failed flushing ${failedCount} entities`);
      });
    }, this.flushInterval);
  }

  public onApplicationShutdown() {
    if (this.interval) clearInterval(this.interval);
  }
}
