import { Module } from "@nestjs/common";

import { MemoryDatabase } from "./memory.database";

@Module({
  exports: ["InternalDatabase"],
  providers: [
    MemoryDatabase,
    {
      provide: "InternalDatabase",
      useExisting: MemoryDatabase,
    },
  ],
})
export class MemoryDatabaseModule {}
