export class TrraficEvent {
  public static readonly eventName = 'trrafic';

  public constructor(
    public readonly type: "up" | "down",
    public readonly userKey: string,
    public readonly amount: number
  ) {}
}
