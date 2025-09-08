/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import chalk from "chalk";
import symbols from "log-symbols";
import { LogProgressReporter } from "../../display/progress.js";
import type { AnonApexBenchmarkResult } from "../anon.js";
import type { GovernorLimits, LimitsContext } from "./schemas.js";

export class LimitsProgressReporter extends LogProgressReporter<
  AnonApexBenchmarkResult<GovernorLimits, LimitsContext>
> {
  pass(result: AnonApexBenchmarkResult<GovernorLimits, LimitsContext>): void {
    const time = result.data.duration;

    let timeMsg = "";
    if (time > 10000) {
      timeMsg = chalk.yellow(`(${time}ms)`);
    } else {
      timeMsg = chalk.grey(`(${time}ms)`);
    }

    this.out(`    ${symbols.success} ${chalk.green("complete")} ${timeMsg}`);
  }
}
