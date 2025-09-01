/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { GovernorLimits } from "../benchmark/limits/schemas.js";
import type { LimitsBenchmarkResult } from "../service/apex.js";

export enum LimitsReportType {
  TABLE = "table",
  JSON = "json",
}

export interface LimitsReporterOptions {
  reportType?: LimitsReportType;
  jsonFilePath?: string;
  fields?: (keyof GovernorLimits)[];
}

export class LimitsReporter {
  protected out = console.log;
  protected err = console.error;
  protected options: LimitsReporterOptions = {};

  setup(options: LimitsReporterOptions = {}): void {
    this.options = options;
  }

  run(results: LimitsBenchmarkResult[]): void {}
}
