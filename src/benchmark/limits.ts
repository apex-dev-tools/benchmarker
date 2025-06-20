/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexScript } from '../parser/apex/script';
import { NamedSchema } from '../parser/json';
import { ExecuteAnonymousOptions } from '../salesforce/execute';
import { ExecuteAnonymousResponse } from '../salesforce/soap/executeAnonymous';
import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
  AnonApexTransaction,
} from './anon';
import { BenchmarkId } from './base';
import { GovernorLimits, LimitsContext } from './limits/schemas';

export interface LimitsBenchmarkOptions {
  id?: BenchmarkId;
  context?: LimitsContext;
  executeAnonymous?: ExecuteAnonymousOptions;
}

// TODO create strategy from script root
// can throw validation errors e.g. no name found or provided

// set flags, extract describe info, track start/stop locations

// construct legacy benchmark if strategy detects this

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
  // use to validate the context generated from script
  protected contextSchema: NamedSchema<LimitsContext>;

  // constructor - receive plan object - partial transactions
  // set bench name

  protected *nextTransaction(): Generator<AnonApexTransaction<LimitsContext>> {
    // from plan - iterate partial transaction
    // load context from either script or plan
    // other action areas would need blanking out
  }

  // protected async prepareTransactions(
  //   actions?: AnonApexAction<LimitsContext>[]
  // ): Promise<AnonApexTransaction<LimitsContext>[]> {
  //   const { code } = this.options;

  //   let content;
  //   if (!code.includes('benchmark.start(')) {
  //     content = 'benchmark.start();';
  //   }
  //   if (!code.includes('benchmark.stop(')) {
  //     content += code + 'benchmark.stop();';
  //   }

  //   return [
  //     {
  //       action: (actions && actions[0]) || { name: '1' },
  //       apexCode:
  //         require('../../scripts/apex/limits.apex') +
  //         require('../../scripts/apex/benchmark.apex') +
  //         'benchmark.begin();' +
  //         content +
  //         'benchmark.end();',
  //       type: AnonApexTransactionType.Data,
  //     },
  //   ];
  // }
}
