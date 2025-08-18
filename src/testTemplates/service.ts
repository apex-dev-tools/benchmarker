/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  AnonApexBenchmark,
  type AnonApexBenchmarkFactory,
  type AnonApexTransaction,
} from "../benchmark/anon.js";
import type { BenchmarkId } from "../benchmark/base.js";
import type { LimitsBenchmarkOptions } from "../benchmark/limits.js";
import {
  limitsSchema,
  type GovernorLimits,
  type LimitsContext,
} from "../benchmark/limits/schemas.js";
import {
  ApexScript,
  type MethodCallDictionary,
} from "../parser/apex/script.js";
import type { ExecuteAnonymousOptions } from "../salesforce/execute.js";
import { limitsApex } from "../scripts/apex.js";
import { ApexBenchmarkService } from "../service/apex.js";
import { AnonApexBenchmarker } from "../service/apex/runner.js";

// private / internal, do not export module from package

const legacyMethodNames = [
  "getCurrentGovernorLimits",
  "getLimitsDiff",
  "assert",
] as const;
type LegacyMethods = MethodCallDictionary<typeof legacyMethodNames>;

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
    id: BenchmarkId,
    context?: LimitsContext,
    executeAnonymous?: ExecuteAnonymousOptions
  ) {
    super(id.name, limitsSchema);

    this.transaction = {
      action: id.action,
      context,
      hasAssertionResult: true,
      executeAnonymous,
      code: limitsApex + script.source,
    };
  }

  protected *nextTransaction(): Generator<AnonApexTransaction<LimitsContext>> {
    yield this.transaction;
  }
}

/**
 * Factory to validate script format and create legacy benchmarks.
 */
export class LegacyBenchmarkFactory
  implements
    AnonApexBenchmarkFactory<
      GovernorLimits,
      LimitsContext,
      LimitsBenchmarkOptions
    >
{
  create(
    script: ApexScript,
    options: LimitsBenchmarkOptions = {}
  ): AnonApexBenchmark<GovernorLimits, LimitsContext> {
    const { id, context, executeAnonymous } = options;
    if (!id) {
      throw new Error("Options with name and action id must be set.");
    }

    this.validateScript(script);

    return new LegacyAnonApexBenchmark(script, id, context, executeAnonymous);
  }

  private validateScript(script: ApexScript): void {
    const methods = script.getMethodCalls();
    const calls: LegacyMethods = script.toMethodDictionary(
      methods.external,
      legacyMethodNames
    );

    if (calls.getCurrentGovernorLimits.length < 2) {
      throw new Error(
        "Script must have at least two calls to: (new GovernorLimits()).getCurrentGovernorLimits()"
      );
    }
    if (calls.getLimitsDiff.length === 0) {
      throw new Error(
        "Script must have a call to: (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits)"
      );
    }

    const assertsData = calls.assert.some(({ node }) => {
      try {
        return (
          // asserts false
          !script.getBooleanParam(node, 0) &&
          // and contains the expected serialize chars
          script.getExpressionParam(node, 1).includes("'-_'")
        );
      } catch {
        // unexpected param type errors from other asserts
        return false;
      }
    });

    if (!assertsData) {
      throw new Error(
        "Script must assert false with data: System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-')"
      );
    }
  }
}

let defaultService: LegacyBenchmarkService | undefined;

/**
 * Override of Apex service to use factory for legacy benchmark scripts.
 */
export class LegacyBenchmarkService extends ApexBenchmarkService {
  constructor() {
    super();
    this.limitsBenchmarker = new AnonApexBenchmarker(
      new LegacyBenchmarkFactory()
    );
  }

  static get default(): LegacyBenchmarkService {
    if (!defaultService) defaultService = new LegacyBenchmarkService();
    return defaultService;
  }
}
