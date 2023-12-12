import { Transform } from "stream";

import { TrafficEventEmitter } from "../event/traffic.event.emitter";

export function createCounterStream(
  eventEmitter: TrafficEventEmitter,
  type: "up" | "down",
  userKey: string,
) {
  let length = 0;
  return new Transform({
    transform(chunk: Buffer, encoding, callback) {
      length += chunk.length;

      this.push(chunk);
      callback();
    },
    flush(callback) {
      eventEmitter.emit("traffic", type, userKey, length);
      length = 0;
      callback();
    },
  });
}
