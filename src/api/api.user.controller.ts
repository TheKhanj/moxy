import { z } from "zod";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { Logger } from "../logger";
import { ApiUserService } from "./api.user.service";
import { UserConfigSchema } from "../config/config.dto";
import { UserNotFoundError } from "../errors";

export class ApiUserController {
  private readonly logger = new Logger("UserController");

  public constructor(private readonly service: ApiUserService) {}

  public register(router: FastifyInstance) {
    router.get("/users", (req, res) => this.queryUsers(req, res));
    router.get("/users/:userKey", (req, res) => this.getUser(req, res));
    router.put("/users/:userKey/stats", (req, res) =>
      this.updateUserStats(req, res)
    );
    router.put("/users/:userKey/config", (req, res) =>
      this.updateUserConfig(req, res)
    );
  }

  public async queryUsers(req: FastifyRequest, res: FastifyReply) {
    const queries = z
      .object({
        offset: z.number().optional(),
        limit: z.number().optional(),
      })
      .safeParse(req.query);

    if (!queries.success) return this.sendBadRequest(res);

    const users = await this.service.queryUsers(
      queries.data.offset,
      queries.data.limit
    );

    await res.type("application/json").code(200).send(users);
  }

  public async getUser(req: FastifyRequest, res: FastifyReply) {
    const params = z
      .object({
        userKey: z.string(),
      })
      .safeParse(req.params);

    if (!params.success) return this.sendBadRequest(res);

    await this.service
      .getUser(params.data.userKey)
      .then((user) => res.type("application/json").code(200).send(user))
      .catch((err) => {
        this.logger.err(err);
        if (err instanceof UserNotFoundError)
          return res.type("application/json").code(404).send("User not found");
        return res
          .type("application/json")
          .code(500)
          .send("Failed getting user");
      });
  }

  public async updateUserStats(req: FastifyRequest, res: FastifyReply) {
    const params = z
      .object({
        userKey: z.string(),
      })
      .safeParse(req.params);

    const body = z
      .object({
        up: z.number().gte(0),
        down: z.number().gte(0),
      })
      .safeParse(req.body);

    if (!params.success || !body.success) return this.sendBadRequest(res);

    await this.service
      .updateUserStats({
        key: params.data.userKey,
        up: body.data.up,
        down: body.data.down,
      })
      .then(() =>
        res.type("application/json").code(200).send("Updated user's stats")
      )
      .catch((err) => {
        this.logger.err(err);

        return res
          .type("application/json")
          .code(500)
          .send("Failed updating user's stats");
      });
  }

  public async updateUserConfig(req: FastifyRequest, res: FastifyReply) {
    const params = z
      .object({
        userKey: z.string(),
      })
      .safeParse(req.params);

    const body = UserConfigSchema.omit({
      key: true,
    }).safeParse(req.body);

    if (!params.success || !body.success) return this.sendBadRequest(res);

    await this.service
      .updateUserConfig({
        key: params.data.userKey,
        ...body.data,
      })
      .then(() =>
        res.type("application/json").code(200).send("Updated user's config")
      )
      .catch((err) => {
        this.logger.err(err);
        return res
          .type("application/json")
          .code(500)
          .send("Failed updating user's config");
      });
  }

  private sendBadRequest(res: FastifyReply) {
    return res.type("application/json").code(400).send("Bad request");
  }
}
