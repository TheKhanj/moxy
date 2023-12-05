import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { IStats } from "../../stats";

@Schema({ collection: "stats", versionKey: false })
export class StatsModel implements IStats {
  @Prop({ type: String })
  key: string;
  @Prop({ type: Number })
  up: number;
  @Prop({ type: Number })
  down: number;
  @Prop({ type: Number })
  limit: number;
  @Prop({ type: String })
  expirationDate: string;
  @Prop({ type: Boolean })
  passthrough: boolean;
}

export const StatsSchema = SchemaFactory.createForClass(StatsModel);
