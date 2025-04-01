/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { ExecuteAnonymousError } from '../soap/executeAnonymous';
import { deserialize } from '../text/json';
import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
  AnonApexTransaction,
  AnonApexTransactionType,
} from './anonApex';

/**
 * Old (deprecated) test structure, with manual tracking and return of limits.
 *
 * @example Expected test format
 * // setup
 * GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
 * // Apex code to test
 * GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();
 * GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);
 * // teardown, extra assertions
 * System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
 */
export class LegacyAnonApexBenchmark extends AnonApexBenchmark {
  async prepare(actions?: string[]): Promise<void> {
    this.transactions = [
      {
        action: (actions && actions[0]) || '1',
        apexCode: require('../../scripts/apex/limits.apex') + this.params.code,
        type: AnonApexTransactionType.Benchmark,
      },
    ];
  }

  protected toBenchmarkResult(
    error: ExecuteAnonymousError,
    transaction: AnonApexTransaction
  ): AnonApexBenchmarkResult {
    return {
      name: this.name,
      action: transaction.action,
      limits: deserialize('limits', this.extractRawData(error)),
    };
  }
}
