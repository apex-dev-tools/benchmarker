/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  AnonApexAction,
  AnonApexBenchmark,
  AnonApexBenchmarkOptions,
  AnonApexTransaction,
  AnonApexTransactionType,
} from './anon';
import { GovernorLimits, LimitsContext, limitsSchema } from './schemas';

/**
 * Standard limits benchmark, with optional start/stop calls in apex. If not
 * present, the whole script is assumed to be a benchmark and the code is
 * wrapped with these calls.
 *
 * @example Expected test format
 * // setup
 * benchmark.start();
 * // Apex code to test
 * benchmark.stop();
 * // teardown, extra assertions
 */
export class LimitsAnonApexBenchmark extends AnonApexBenchmark<
  GovernorLimits,
  LimitsContext
> {
  constructor(options: AnonApexBenchmarkOptions) {
    super(options, limitsSchema);
  }

  protected async prepareTransactions(
    actions?: AnonApexAction<LimitsContext>[]
  ): Promise<AnonApexTransaction<LimitsContext>[]> {
    const { code } = this.options;

    let content;
    if (!code.includes('benchmark.start(')) {
      content = 'benchmark.start();';
    }
    if (!code.includes('benchmark.stop(')) {
      content += code + 'benchmark.stop();';
    }

    return [
      {
        action: (actions && actions[0]) || { name: '1' },
        apexCode:
          require('../../../scripts/apex/limits.apex') +
          require('../../../scripts/apex/benchmark.apex') +
          'benchmark.begin();' +
          content +
          'benchmark.end();',
        type: AnonApexTransactionType.Data,
      },
    ];
  }
}
