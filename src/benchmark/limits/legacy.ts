/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexScript } from '../../parser/apex/script.js';
import { limitsApex } from '../../scripts/apex.js';
import { AnonApexBenchmark, AnonApexTransaction } from '../anon.js';
import { LimitsBenchmarkOptions } from '../limits.js';
import { LimitsScriptFormat } from './factory.js';
import { GovernorLimits, LimitsContext, limitsSchema } from './schemas.js';

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
    script: ApexScript,
    format: LimitsScriptFormat,
    options: LimitsBenchmarkOptions
  ) {
    super(format.name, limitsSchema);

    const { name: action, context } = format.actions[0];

    this.transaction = {
      action,
      context,
      hasAssertionResult: true,
      executeAnonymous: options.executeAnonymous,
      code: limitsApex + script.source,
    };
  }

  protected *nextTransaction(): Generator<AnonApexTransaction<LimitsContext>> {
    yield this.transaction;
  }
}
