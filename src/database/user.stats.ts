export type IUserStats = {
  key: string;
  up: number;
  down: number;
};

export class UserStats implements IUserStats {
  public constructor(
    public key: string,
    public up: number,
    public down: number
  ) {}

  public static create(from: IUserStats) {
    return new UserStats(from.key, from.up, from.down);
  }

  public get total() {
    return this.up + this.down;
  }

  public clone(): UserStats {
    return new UserStats(this.key, this.up, this.down);
  }

  public toObject(): IUserStats {
    return {
      key: this.key,
      up: this.up,
      down: this.down,
    };
  }
}
