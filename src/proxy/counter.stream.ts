import { Transform } from "stream";

import { TrafficEventEmitter } from "../event/traffic.event.emitter";

export function createCounterStream(
  eventEmitter: TrafficEventEmitter,
  type: "up" | "down",
  userKey: string,
) {
  return new Transform({
    transform(chunk: Buffer, encoding, callback) {
      eventEmitter.emit("traffic", type, userKey, chunk.length);

      this.push(chunk);
      callback();
    },
  });
}
