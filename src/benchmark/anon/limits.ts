/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexScript } from '../../parser/apex';
import { ExecuteAnonymousOptions } from '../../salesforce/execute';
import {
  AnonApexAction,
  AnonApexBenchmark,
  AnonApexTransaction,
  AnonApexTransactionType,
} from '../anon';
import { GovernorLimits, LimitsContext, limitsSchema } from './schemas';

export interface LimitsBenchmarkOptions {
  /**
   * Fallback name to identify the benchmark in results.
   */
  name?: string;

  actions?: AnonApexAction<LimitsContext>;

  executeAnonymous?: ExecuteAnonymousOptions;
}

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
  static create(
    script: ApexScript,
    options?: LimitsBenchmarkOptions
  ): AnonApexBenchmark<GovernorLimits, LimitsContext> {
    // TODO create strategy from visiting tree
    // can throw errors e.g. no name found or provided
    // script root path means it was in a dir
    // problem with multiple paths tho
    // flag on apex script during parsePaths ?
    // construct legacy benchmark if strategy detects this
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
