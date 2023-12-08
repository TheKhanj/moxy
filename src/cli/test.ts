import { z } from "zod";
import { Args, parseArgs } from "./parse.args";
import axios from "axios";

async function handleUser(
  key: string,
  sub: Extract<Args, { name: "user" }>["subcommand"]
) {
  const endpoints = [`/users/${key}`];
  const body = {};
  let method: string | undefined;

  let q: {
    method?: string;
    name: string;
    params?: object;
    subcommand?: any;
  } = sub;

  do {
    endpoints.push(q.name);
    Object.assign(body, q.params);
    method = q.method ?? method;
    q = q.subcommand;
  } while (q);

  const m = z
    .union([
      z.literal("get"),
      z.literal("post"),
      z.literal("delete"),
      z.literal("put"),
    ])
    .parse(method);

  const endpoint = endpoints.join("/");

  const res = await axios.request({
    url: "http://127.0.0.1:3000" + endpoint,
    method: m,
    data: body,
  });

  return res.data;
}

export function handleCommand(args: string[]) {
  const p = parseArgs(args);

  switch (p.name) {
    case "user":
      return handleUser(p.params.user, p.subcommand);
  }
}

async function main() {
  const res = await handleCommand(process.argv.slice(2));
  console.log(
    (() => {
      try {
        return JSON.stringify(res, null, 2);
      } catch (err) {
        return res;
      }
    })()
  );
}

main();
