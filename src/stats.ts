import { stringToDate } from "./utils";

export const UNLIMIT_TRAFFIC = -1;
export const NO_EXPIRATION_DATE = '';

export type IStats = {
  key: string;
  up: number;
  down: number;
  limit: number;
  expirationDate: string;
  passthrough: boolean;
};

export class Stats implements IStats {
  public constructor(
    public key: string,
    public up: number,
    public down: number,
    public limit: number,
    public expirationDate: string,
    public passthrough: boolean
  ) {}

  public static create(from: IStats) {
    return new Stats(
      from.key,
      from.up,
      from.down,
      from.limit,
      from.expirationDate,
      from.passthrough
    );
  }

  public get total() {
    return this.up + this.down;
  }

  public clone(): Stats {
    return new Stats(
      this.key,
      this.up,
      this.down,
      this.limit,
      this.expirationDate,
      this.passthrough
    );
  }

  public toObject(): IStats {
    return {
      key: this.key,
      up: this.up,
      down: this.down,
      limit: this.limit,
      expirationDate: this.expirationDate,
      passthrough: this.passthrough,
    };
  }

  public get enabled() {
    if (!this.passthrough) return false;
    if (this.limit != -1 && this.total > this.limit) return false;
    if (
      this.expirationDate !== "" &&
      new Date().getTime() > stringToDate(this.expirationDate).getTime()
    )
      return false;
    return true;
  }
}
