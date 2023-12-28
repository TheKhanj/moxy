export class MoxyError extends Error {}

export class UserNotFoundError extends Error {
  public constructor(key: string) {
    super(`User ${key} not found`)
  }
}
