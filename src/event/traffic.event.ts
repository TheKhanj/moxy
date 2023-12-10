export class TrafficEvent {
  public static readonly eventName = 'traffic';

  public constructor(
    public readonly type: "up" | "down",
    public readonly userKey: string,
    public readonly amount: number
  ) {}
}