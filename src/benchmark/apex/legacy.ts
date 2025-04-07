/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { extractAssertionData } from '../../org/execute';
import { ExecuteAnonymousResponse } from '../../org/soap/executeAnonymous';
import { limitsSchema } from '../schemas';
import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
  AnonApexTransaction,
  AnonApexTransactionType,
} from './anon';

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
        type: AnonApexTransactionType.Data,
      },
    ];
  }

  protected toBenchmarkResult(
    response: ExecuteAnonymousResponse,
    transaction: AnonApexTransaction
  ): AnonApexBenchmarkResult {
    return {
      name: this.name,
      action: transaction.action,
      limits: extractAssertionData(response, limitsSchema),
    };
  }
}
