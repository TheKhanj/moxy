type Level =
  | "emerg"
  | "alert"
  | "crit"
  | "err"
  | "warning"
  | "notice"
  | "info"
  | "debug";

export class Log {
  public constructor(
    public readonly name: string,
    public readonly parent: Log | null = null
  ) {}

  public toString(): string {
    const prefix = this.parent ? this.parent.toString() : "";

    return `${prefix}: ${this.name}`;
  }
}

export class Logger {
  public constructor(
    private readonly outputStream: NodeJS.WritableStream = process.stdout
  ) {}

  public emerg(message: string | Log) {
    this.log("emerg", message);
  }
  public alert(message: string | Log) {
    this.log("alert", message);
  }
  public crit(message: string | Log) {
    this.log("crit", message);
  }
  public err(message: string | Log) {
    this.log("err", message);
  }
  public warning(message: string | Log) {
    this.log("warning", message);
  }
  public notice(message: string | Log) {
    this.log("notice", message);
  }
  public info(message: string | Log) {
    this.log("info", message);
  }
  public debug(message: string | Log) {
    this.log("debug", message);
  }

  private log(level: Level, message: string | Log) {
    this.outputStream.write(`${level} - ${message}`);
  }
}
