import { UserStats } from "./user.stats";

export interface Database {
  get(key: string): Promise<UserStats>;
  inc(key: string, up: number, down: number): Promise<void>;
  set(key: string, up: number, down: number): Promise<void>;
}
