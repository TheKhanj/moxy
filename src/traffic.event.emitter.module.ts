import { Module } from "@nestjs/common";
import EventEmitter from "node:events";

export const TRAFFIC_EVENT_EMITTER = "TrafficEventEmitter";

@Module({
  exports: [TRAFFIC_EVENT_EMITTER],
  providers: [
    {
      provide: TRAFFIC_EVENT_EMITTER,
      useValue: new EventEmitter(),
    },
  ],
})
export class TrafficEventEmitterModule {}
