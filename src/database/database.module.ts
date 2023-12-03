import { DynamicModule, Global, Module } from "@nestjs/common";

import { MemoryDatabase } from "./memory.database";

export const DATABASE = "Database";

@Global()
@Module({
  exports: [DATABASE],
  providers: [MemoryDatabase],
})
export class DatabaseModule {
  public static register(inMemory: boolean): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE,
          inject: [MemoryDatabase],
          useFactory: (mDb: MemoryDatabase) => {
            if (inMemory) return mDb;
            throw new Error("not implemented");
          },
        },
      ],
    };
  }
}
