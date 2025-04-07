/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { AnonApexBenchmark, AnonApexBenchmarkParams } from './apex/anon';
import { LegacyAnonApexBenchmark } from './apex/legacy';
import { TokenReplacement } from '../services/tokenReplacement';

export interface ApexBenchmarkOptions {
  /**
   * Map of string value replacement applied on Apex code.
   *
   * @example
   * tokens: [{ token: '%var', value: '100' }]
   * // Integer i = %var; -> Integer i = 100;
   */
  tokens?: TokenReplacement[];
  /**
   * List of namespaces to be removed from any Apex code.
   *
   * Removes the need to write separate benchmark scripts for managed and
   * unmanaged executions.
   */
  unmanagedNamespaces?: string[];
}

export function createAnonApexBenchmark(
  name: string,
  params: AnonApexBenchmarkParams
): AnonApexBenchmark {
  if (
    params.code.includes('new GovernorLimits()') &&
    params.code.includes("System.assert(false, '-_'")
  ) {
    return new LegacyAnonApexBenchmark(name, params);
  }

  return new AnonApexBenchmark(name, params);
}
