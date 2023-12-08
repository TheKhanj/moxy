import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";

import {
  AddExpirationDateDto,
  SetExpirationDateDto,
  TrafficLimitDto,
  UserIdDto,
} from "./user.dtos";
import { UserService } from "./user.service";

@ApiTags("User")
@Controller("/users/:key")
export class UserController {
  public constructor(private readonly service: UserService) {}

  @Post("/create")
  public async create(@Param() userId: UserIdDto) {
    await this.service.assert(userId.key);
  }

  @Get("/get")
  public async get(@Param() userId: UserIdDto) {
    const user = await this.service.get(userId.key);

    return user.toObject();
  }
}

@ApiTags("Traffic")
@Controller("/users/:key/traffic")
export class UserTrafficController {
  public constructor(private readonly service: UserService) {}

  @Put("/set")
  public async set(@Param() userId: UserIdDto, @Body() body: TrafficLimitDto) {
    await this.service.update(userId.key, {
      limit: body.limit,
    });
  }

  @Put("/add")
  public async add(
    @Param()
    userId: UserIdDto,
    @Body() body: TrafficLimitDto
  ) {
    await this.service.addTraffic(userId.key, body.limit);
  }

  @Put("/reset")
  public async reset(
    @Param()
    userId: UserIdDto
  ) {
    await this.service.update(userId.key, {
      up: 0,
      down: 0,
    });
  }
}

@ApiTags("ExpirationDate")
@Controller("/users/:key/expiration-date")
export class UserExpirationDateController {
  public constructor(private readonly service: UserService) {}

  @Put("/set")
  public async set(
    @Param() userId: UserIdDto,
    @Body() body: SetExpirationDateDto
  ) {
    await this.service.update(userId.key, {
      expirationDate: body.expirationDate,
    });
  }

  @Put("/add")
  public async add(
    @Param() userId: UserIdDto,
    @Body() body: AddExpirationDateDto
  ) {
    await this.service.addExpirationDate(userId.key, body.expirationDate);
  }
}

@ApiTags("Passthrough")
@Controller("/users/:key/passthrough")
export class UserPassthroughController {
  public constructor(private readonly service: UserService) {}

  @Put("/enable")
  public async enable(@Param() userId: UserIdDto) {
    await this.service.update(userId.key, {
      passthrough: true,
    });
  }

  @Put("/disable")
  public async disable(@Param() userId: UserIdDto) {
    await this.service.update(userId.key, {
      passthrough: false,
    });
  }

  @Put("/toggle")
  public async toggle(@Param() userId: UserIdDto) {
    await this.service.togglePassthrough(userId.key);
  }
}
