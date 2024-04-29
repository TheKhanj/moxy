type Level =
  | "emerg"
  | "alert"
  | "crit"
  | "err"
  | "warning"
  | "notice"
  | "info"
  | "debug";

export class Logger {
  public readonly context: string[];

  public constructor(
    context: string[] | string | null = null,
    private readonly outputStream: NodeJS.WritableStream = process.stdout
  ) {
    this.context = context
      ? typeof context === "string"
        ? [context]
        : context
      : [];
  }

  public emerg(message: string) {
    this.log("emerg", message);
  }
  public alert(message: string) {
    this.log("alert", message);
  }
  public crit(message: string) {
    this.log("crit", message);
  }
  public err(message: string) {
    this.log("err", message);
  }
  public warning(message: string) {
    this.log("warning", message);
  }
  public notice(message: string) {
    this.log("notice", message);
  }
  public info(message: string) {
    this.log("info", message);
  }
  public debug(message: string) {
    this.log("debug", message);
  }

  private log(level: Level, message: string) {
    const ctx = this.context.join(": ");
    this.outputStream.write(`${ctx}${level} - ${message}`);
  }
}
