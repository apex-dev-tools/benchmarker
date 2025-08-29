/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { LogProgressReporter } from "../../display/progress.js";
import type { AnonApexBenchmarkResult } from "../anon.js";
import type { GovernorLimits, LimitsContext } from "./schemas.js";

export class LimitsProgressReporter extends LogProgressReporter<
  AnonApexBenchmarkResult<GovernorLimits, LimitsContext>
> {}
