/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { CommandModule, Argv } from "yargs";
import limitsCmd from "./apex/limits.js";

export default function (yargs: Argv): CommandModule {
  return {
    command: "apex",
    describe: "Commands for benchmarking apex",
    builder(argv: Argv): Argv {
      return argv.command([limitsCmd(argv)]);
    },
    handler() {
      yargs.showHelp();
    },
  };
}
