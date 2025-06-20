/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { AnonApexBenchmark, AnonApexTransaction } from '../anon';
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
  private transaction: AnonApexTransaction<LimitsContext>;

  constructor(
    name: string,
    code: string,
    transactionConfig: Omit<AnonApexTransaction<LimitsContext>, 'code'>
  ) {
    super(name, limitsSchema);

    this.transaction = {
      ...transactionConfig,
      code: require('../../../scripts/apex/limits.apex') + code,
    };
  }

  protected *nextTransaction(): Generator<AnonApexTransaction<LimitsContext>> {
    return this.transaction;
  }
}
