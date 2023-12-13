import { z } from "zod";

const ExpirationDateSchema = z
  .union([
    z.literal("unlimit"),
    z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/),
  ])
  .default("unlimit");

const UserTcpProxyConfigSchema = z.object({
  protocol: z.literal("tcp"),
  listeningPort: z.number(),
  forwardingPort: z.number(),
  forwardingAddress: z.string().default("0.0.0.0"),
});

const UserProxyConfigSchema = z.union([UserTcpProxyConfigSchema, z.never()]);

const UserConfigSchema = z.object({
  key: z.string().default("placeholder"),
  remark: z.string().optional(),
  limit: z.union([z.number(), z.literal("unlimit")]).default("unlimit"),
  expirationDate: ExpirationDateSchema,
  passthrough: z.boolean().default(true),
  proxy: UserProxyConfigSchema,
});

const MongoDbDatabaseDriverConfigSchema = z.object({
  type: z.literal("mongodb"),
  url: z.string().default("mongodb://127.0.0.1:27017"),
  databaseName: z.string().default("moxy"),
});

const MemoryDatabaseDriverConfigSchema = z.object({
  type: z.literal("memory"),
});

const FileDatabaseDriverConfigSchema = z.object({
  type: z.literal("file"),
  path: z.string(),
});

const DatabaseDriverConfigSchema = z
  .union([
    MongoDbDatabaseDriverConfigSchema,
    MemoryDatabaseDriverConfigSchema,
    FileDatabaseDriverConfigSchema,
  ])
  .default({
    // TODO: change this to file
    type: "memory",
  });

const LocalDatabaseMutexConfigSchema = z.object({
  type: z.literal("local"),
});

const DatabaseMutexConfigSchema = z
  .union([LocalDatabaseMutexConfigSchema, z.never()])
  .default({
    type: "local",
  });

const DatabaseConfigSchema = z
  .object({
    driver: DatabaseDriverConfigSchema,
    mutex: DatabaseMutexConfigSchema,
    flush: z.number().default(10_000),
  })
  .default({});

const ProxyConfigSchema = z
  .object({
    counter: z
      .object({
        flushTimeout: z.number().default(10_000),
      })
      .default({}),
  })
  .default({});

export const ConfigSchema = z.object({
  ttl: z.number().default(5 * 60_000),
  proxy: ProxyConfigSchema,
  database: DatabaseConfigSchema,
  users: z.record(UserConfigSchema),
});
