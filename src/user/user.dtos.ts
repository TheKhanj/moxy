import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateBy,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

import { NO_EXPIRATION_DATE, UNLIMIT_TRRAFIC } from "../stats";

export class UserIdDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: "user1" })
  key: string;
}

export class TrraficLimitDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ examples: [1_000_000, "unlimit"] })
  @Min(0)
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    return value.toLowerCase() === "unlimit" ? UNLIMIT_TRRAFIC : value;
  })
  limit: number;
}

export class SetExpirationDateDto {
  @IsNotEmpty()
  @IsString()
  @ValidateBy({
    name: "ExpirationDateValidator",
    validator: (value: any) => {
      if (typeof value !== "string") return false;
      const regex = /^\d{4}-\d{1,2}-\d{1,2}/;
      return value.match(regex)?.length === 1;
    },
  })
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    return value.toLowerCase() === "unlimit" ? NO_EXPIRATION_DATE : value;
  })
  expirationDate: string;
}

export class AddExpirationDateDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  expirationDate: number;
}
