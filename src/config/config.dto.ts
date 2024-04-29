import { z } from "zod";

const ExpirationDateSchema = z
  .union([
    z.literal("unlimit"),
    z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/),
  ])
  .default("unlimit");
export type ExpirationDate = z.output<typeof ExpirationDateSchema>;

const UserTcpProxyConfigSchema = z.object({
  protocol: z.literal("tcp"),
  listeningPort: z.number(),
  forwardingPort: z.number(),
  forwardingAddress: z.string().default("0.0.0.0"),
  flushInterval: z.number().default(10_000),
  socketTimeout: z.number().default(60_000),
});
export type UserTcpProxyConfig = z.output<typeof UserTcpProxyConfigSchema>;

const UserProxyConfigSchema = z.union([UserTcpProxyConfigSchema, z.never()]);
export type UserProxyConfig = z.output<typeof UserProxyConfigSchema>;

const UserConfigSchema = z.object({
  key: z.string().default("placeholder"),
  remark: z.string().optional(),
  limit: z.union([z.number(), z.literal("unlimit")]).default("unlimit"),
  expirationDate: ExpirationDateSchema,
  passthrough: z.boolean().default(true),
  proxy: UserProxyConfigSchema,
});
export type UserConfig = z.output<typeof UserConfigSchema>;

const MongoDBDatabaseDriverConfigSchema = z.object({
  type: z.literal("mongodb"),
  url: z.string().default("mongodb://127.0.0.1:27017"),
  databaseName: z.string().default("moxy"),
});
export type MongoDBDatabaseDriverConfig = z.output<
  typeof MongoDBDatabaseDriverConfigSchema
>;

const MemoryDatabaseDriverConfigSchema = z.object({
  type: z.literal("memory"),
});
export type MemoryDatabaseDriverConfig = z.output<
  typeof MemoryDatabaseDriverConfigSchema
>;

const FileDatabaseDriverConfigSchema = z.object({
  type: z.literal("file"),
  path: z.string().default("moxy.database.json"),
});
export type FileDatabaseDriverConfig = z.output<
  typeof FileDatabaseDriverConfigSchema
>;

const DatabaseDriverConfigSchema = z
  .union([
    MongoDBDatabaseDriverConfigSchema,
    MemoryDatabaseDriverConfigSchema,
    FileDatabaseDriverConfigSchema,
  ])
  .default({
    type: "file",
  });
export type DatabaseDriverConfig = z.output<typeof DatabaseDriverConfigSchema>;

const DatabaseConfigSchema = z
  .object({
    driver: DatabaseDriverConfigSchema,
    flush: z.number().default(10_000),
  })
  .default({});
export type DatabaseConfig = z.output<typeof DatabaseConfigSchema>;

export const ConfigSchema = z.object({
  pidFile: z.string().default("moxy.pid"),
  database: DatabaseConfigSchema,
  users: z.record(UserConfigSchema),
});
export type Config = z.output<typeof ConfigSchema>;
