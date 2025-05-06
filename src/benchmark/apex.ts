/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { DegLimitsMetric } from '../metrics/limits/deg';
import {
  AnonApexAction,
  AnonApexBenchmark,
  AnonApexBenchmarkOptions,
  AnonApexBenchmarkResult,
} from './apex/anon';
import { LegacyAnonApexBenchmark } from './apex/legacy';
import { LimitsAnonApexBenchmark } from './apex/limits';
import { GovernorLimits, LimitsContext } from './apex/schemas';

export type ApexBenchmark = AnonApexBenchmark<GovernorLimits, LimitsContext>;
export type ApexAction = AnonApexAction<LimitsContext>;
export type ApexMetrics = {
  deg?: DegLimitsMetric;
};
export type ApexBenchmarkResult = AnonApexBenchmarkResult<
  GovernorLimits,
  LimitsContext
> &
  ApexMetrics;

export function createAnonApexBenchmark(
  options: AnonApexBenchmarkOptions
): ApexBenchmark {
  const { code } = options;
  if (
    code.includes('new GovernorLimits()') &&
    code.includes("System.assert(false, '-_'")
  ) {
    return new LegacyAnonApexBenchmark(options);
  }

  return new LimitsAnonApexBenchmark(options);
}
