/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { CommandModule, Argv, ArgumentsCamelCase } from "yargs";

export interface RunLimitsArgs {
  paths?: string[];
}

export default function (yargs: Argv): CommandModule<unknown, RunLimitsArgs> {
  return {
    command: "limits [paths..]",
    describe: "run limits benchmarks",
    builder(yargs: Argv): Argv<RunLimitsArgs> {
      return yargs.positional("paths", {
        array: true,
        describe:
          "files or dirs with benchmark scripts, defaults to working directory",
        type: "string",
      });
    },
    handler,
  };
}

function handler(args: ArgumentsCamelCase<RunLimitsArgs>): Promise<void> {
  return Promise.resolve();
}
