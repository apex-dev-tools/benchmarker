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
 * Old (deprecated) script structure, with manual tracking and return of limits.
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
export class LegacyAnonApexBenchmark extends AnonApexBenchmark<
  GovernorLimits,
  LimitsContext
> {
  constructor(options: AnonApexBenchmarkOptions) {
    super(options, limitsSchema);
  }

  protected async prepareTransactions(
    actions?: AnonApexAction<LimitsContext>[]
  ): Promise<AnonApexTransaction<LimitsContext>[]> {
    return [
      {
        action: (actions && actions[0]) || { name: '1' },
        apexCode:
          require('../../../scripts/apex/limits.apex') + this.options.code,
        type: AnonApexTransactionType.Data,
      },
    ];
  }
}
