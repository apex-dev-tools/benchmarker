/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { ApexScript } from "../parser/apex/script.js";
import type { ExecuteAnonymousOptions } from "../salesforce/execute.js";
import { benchmarkApex, limitsApex } from "../scripts/apex.js";
import { AnonApexBenchmark, type AnonApexTransaction } from "./anon.js";
import type { BenchmarkId } from "./base.js";
import type { LimitsScriptFormat } from "./limits/factory.js";
import { LimitsProgressReporter } from "./limits/progress.js";
import {
  type GovernorLimits,
  type LimitsContext,
  limitsSchema,
} from "./limits/schemas.js";

export interface LimitsBenchmarkOptions {
  id?: BenchmarkId;
  context?: LimitsContext;
  executeAnonymous?: ExecuteAnonymousOptions;
  progress?: boolean;
}

/**
 * Standard limits benchmark, with optional start/stop calls in apex. If not
 * present, the whole script is assumed to be a benchmark and the code is
 * wrapped with these calls.
 *
 * @example Simple test format
 *   // setup
 * start();
 *   // test code
 * stop();
 *   // teardown, extra assertions
 *
 * @example Advanced test format
 * benchmark('name');
 *   // shared code
 * describe('action');
 *   // exclusive code
 *   start();
 *   // test code
 *   stop();
 *
 * // multiple describe blocks
 * describe('action2');
 *   ...
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
    const reporter = options.progress
      ? new LimitsProgressReporter()
      : undefined;

    super(format.name, limitsSchema, reporter);

    this.script = script;
    this.format = format;
    this.options = options;
    this.header =
      format.headerEndIndex != null
        ? script.getTextBetweenBlocks(0, format.headerEndIndex)
        : "";
  }

  protected *nextTransaction(): Generator<AnonApexTransaction<LimitsContext>> {
    for (const action of this.format.actions) {
      const transaction: AnonApexTransaction<LimitsContext> = {
        code: `${limitsApex}\n${benchmarkApex}\n`,
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
        transaction.code += "\ndone();";
      }

      yield transaction;
    }
  }
}
