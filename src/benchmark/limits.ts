/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexScript } from '../parser/apex/script';
import { ExecuteAnonymousOptions } from '../salesforce/execute';
import { AnonApexBenchmark, AnonApexTransaction } from './anon';
import { BenchmarkId } from './base';
import { LimitsScriptFormat } from './limits/factory';
import { GovernorLimits, LimitsContext, limitsSchema } from './limits/schemas';

export interface LimitsBenchmarkOptions {
  id?: BenchmarkId;
  context?: LimitsContext;
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
  protected script: ApexScript;
  protected format: LimitsScriptFormat;
  protected options: LimitsBenchmarkOptions;
  private header: string;
  // use to validate the context generated from script
  // protected contextSchema: NamedSchema<LimitsContext>;

  constructor(
    script: ApexScript,
    format: LimitsScriptFormat,
    options: LimitsBenchmarkOptions
  ) {
    super(format.name, limitsSchema);
    this.script = script;
    this.format = format;
    this.options = options;
    this.header =
      format.headerEndIndex != null
        ? script.getTextBetweenBlocks(0, format.headerEndIndex)
        : '';
  }

  protected *nextTransaction(): Generator<AnonApexTransaction<LimitsContext>> {
    const limitsText = require('../../scripts/apex/limits.apex');
    const benchmarkText = require('../../scripts/apex/benchmark.apex');

    for (const action of this.format.actions) {
      const transaction: AnonApexTransaction<LimitsContext> = {
        code: `${limitsText}\n${benchmarkText}\n`,
        action: action.name,
        context: action.context,
        hasAssertionResult: true,
        executeAnonymous: this.options.executeAnonymous,
      };

      if (action.blockBeginIndex == null) {
        // no describe
        if (action.needsWrapping) {
          transaction.code += `start();\n${this.script.source}\nstop();`;
        } else {
          transaction.code += this.script.source;
        }
      } else {
        // extract current describe block
        // join to header
        const describeText = this.script.getTextBetweenBlocks(
          action.blockBeginIndex,
          action.blockEndIndex
        );
        transaction.code += `${this.header}\n${describeText}`;
      }

      if (action.needsEnding) {
        transaction.code += '\ndone();';
      }

      yield transaction;
    }
  }
}
