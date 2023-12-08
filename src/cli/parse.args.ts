import z from "zod";

function parseTrafficArgs(args: string[]) {
  if (args.length < 1) viewTrafficHelp();

  const firstArg = args[0];

  const parsed = z
    .union([z.literal("reset"), z.literal("set"), z.literal("add")])
    .safeParse(firstArg);

  if (!parsed.success) viewTrafficHelp();

  switch (parsed.data) {
    case "reset":
      return {
        method: "put",
        name: parsed.data,
      };
    case "set":
    case "add":
      if (args.length < 2) viewTrafficHelp();
      return {
        method: "put",
        name: parsed.data,
        params: {
          limit: args[1],
        },
      } as const;
  }
}

function parseExpirationDateArgs(args: string[]) {
  if (args.length < 1) viewExpirationDateHelp();

  const firstArg = args[0];

  const parsed = z
    .union([z.literal("set"), z.literal("add")])
    .safeParse(firstArg);

  if (!parsed.success) viewExpirationDateHelp();

  switch (parsed.data) {
    case "set":
      if (args.length < 2) viewExpirationDateHelp();
      return {
        method: "put",
        name: parsed.data,
        params: { date: args[1] },
      } as const;
    case "add":
      if (args.length < 2) viewExpirationDateHelp();
      return {
        method: "put",
        name: parsed.data,
        params: {
          limit: args.slice(1),
        },
      } as const;
  }
}

function parsePassthroughArgs(args: string[]) {
  if (args.length < 1) viewUserPassthroughHelp();

  const firstArg = args[0];

  const parsed = z
    .union([z.literal("enable"), z.literal("disable"), z.literal("toggle")])
    .safeParse(firstArg);

  if (!parsed.success) viewUserPassthroughHelp();

  return {
    method: "put",
    name: parsed.data,
  } as const;
}

function parseUserArgs(args: string[]) {
  if (args.length < 1) viewUserHelp();

  const subcommand = args[0];

  const parsed = z
    .union([
      z.literal("create"),
      z.literal("get"),
      z.literal("delete"),
      z.literal("traffic"),
      z.literal("expiration-date"),
      z.literal("passthrough"),
    ])
    .safeParse(subcommand);

  if (!parsed.success) viewUserHelp();

  switch (parsed.data) {
    case "create":
      return {
        method: "post",
        name: parsed.data,
      } as const;
    case "get":
      return {
        method: "get",
        name: parsed.data,
      } as const;
    case "delete":
      return {
        method: "delete",
        name: parsed.data,
      } as const;
    case "traffic":
      return {
        name: parsed.data,
        subcommand: parseTrafficArgs(args.slice(1)),
      } as const;
    case "expiration-date":
      return {
        name: parsed.data,
        subcommand: parseExpirationDateArgs(args.slice(1)),
      } as const;
    case "passthrough":
      return {
        name: parsed.data,
        subcommand: parsePassthroughArgs(args.slice(1)),
      } as const;
  }
}

export function parseArgs(args: string[]) {
  if (args.length < 1) viewHelp();

  const firstArg = args[0];

  const parsed = z
    .union([z.literal("user"), z.literal("daemon")])
    .safeParse(firstArg);

  if (!parsed.success) viewHelp();

  switch (parsed.data) {
    case "user":
      if (args.length < 2) viewHelp();
      return {
        name: "user",
        params: { user: args[1] },
        subcommand: parseUserArgs(args.slice(2)),
      } as const;
    case "daemon":
      return {
        name: "daemon",
        subcommand: null,
      } as const;
  }
}

export type Args = ReturnType<typeof parseArgs>;

// TODO: implement
function viewHelp(): never {
  console.log("call cli properly idiot");
  process.exit(1);
}

function viewUserHelp(): never {
  viewHelp();
}

function viewTrafficHelp(): never {
  viewHelp();
}

function viewExpirationDateHelp(): never {
  viewHelp();
}

function viewUserPassthroughHelp(): never {
  viewHelp();
}
