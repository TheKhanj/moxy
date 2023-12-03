import { Stats } from "../stats";

export interface Database {
  get(key: string): Promise<Stats>;
  set(key: string, stats: Stats): Promise<void>;
}
