import { Transform } from "stream";

import { TrafficEventEmitter } from "../event/traffic.event.emitter";

export function createCounterStream(
  eventEmitter: TrafficEventEmitter,
  type: "up" | "down",
  userKey: string,
  timeout: number,
) {
  let length = 0;
  let flushTimeout: NodeJS.Timeout | null = null;

  const flushEvent = () => {
    eventEmitter.emit("traffic", type, userKey, length);
    length = 0;

    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
  };

  return new Transform({
    transform(chunk: Buffer, _, callback) {
      length += chunk.length;

      if (!flushTimeout) flushTimeout = setTimeout(flushEvent, timeout);

      this.push(chunk);
      callback();
    },
    final(callback) {
      flushEvent();

      callback();
    },
  });
}
