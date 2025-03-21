/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
  AnonApexTransaction,
  AnonApexTransactionType,
} from './anonApex';
import { validate } from './anonApex/validate';

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
        apexCode:
          require('../../../scripts/apex/limits.apex') + this.params.code,
        type: AnonApexTransactionType.TestCase,
      },
    ];
  }

  protected buildBenchmarkResult(
    data: string,
    transaction: AnonApexTransaction
  ): AnonApexBenchmarkResult | undefined {
    const resMatch = data.match(LegacyAnonApexBenchmark.resultPattern);
    const json = resMatch && JSON.parse(resMatch[1]);
    const limits = validate('limits', json);

    if (limits) {
      return {
        name: this.name,
        action: transaction.action,
        limits,
      };
    }
    return undefined;
  }
}
