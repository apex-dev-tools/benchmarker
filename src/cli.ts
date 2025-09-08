#!/usr/bin/env node
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import apexCmd from "./cli/apex.js";

const argv = yargs(hideBin(process.argv));

argv
  .scriptName("benchmarker")
  .usage("Usage: $0 <command> [options]")
  .command([apexCmd(argv)])
  .demandCommand()
  .strict()
  .help()
  .alias("h", "help")
  .alias("v", "version")
  .wrap(argv.terminalWidth());

await argv.parse();
