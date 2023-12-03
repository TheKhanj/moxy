import { Module } from "@nestjs/common";
import EventEmitter from "node:events";

export const TRRAFIC_EVENT_EMITTER = "TrraficEventEmitter";

@Module({
  exports: [TRRAFIC_EVENT_EMITTER],
  providers: [
    {
      provide: TRRAFIC_EVENT_EMITTER,
      useValue: new EventEmitter(),
    },
  ],
})
export class TrraficEventEmitterModule {}
