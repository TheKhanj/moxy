import { UserStats } from "../user/user.stats";

export interface Database {
  get(key: string): Promise<UserStats>;
  inc(key: string, stats: UserStats): Promise<void>;
  set(key: string, stats: UserStats): Promise<void>;
}
