import { Logger } from "@nestjs/common";

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
  fn: () => Promise<T>,
  logger: Logger
) {
  return fn().catch((err) => logger.error(err));
}
