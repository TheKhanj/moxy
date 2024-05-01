import { Logger } from "./logger";

export function dateToString(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function stringToDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  const dateObject = new Date(year, month - 1, day);

  dateObject.setHours(0, 0, 0, 0);

  return dateObject;
}

export async function withErrorLogging<T>(
  fn: (() => Promise<T>) | (() => T),
  logger: Logger
) {
  return Promise.resolve(fn()).catch((err) => {
    logger.err(err);
  });
}
