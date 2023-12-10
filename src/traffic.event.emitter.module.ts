import { Module } from "@nestjs/common";

import { TrafficEventEmitter } from "./event/traffic.event.emitter";

export const TRAFFIC_EVENT_EMITTER = "TrafficEventEmitter";

@Module({
  exports: [TRAFFIC_EVENT_EMITTER],
  providers: [
    {
      provide: TRAFFIC_EVENT_EMITTER,
      useValue: new TrafficEventEmitter(),
    },
  ],
})
export class TrafficEventEmitterModule {}
