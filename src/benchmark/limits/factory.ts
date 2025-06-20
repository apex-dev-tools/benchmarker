/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexScript, MethodCallDictionary } from '../../parser/apex/script';
import { AnonLiteralString, ApexNature } from '../../parser/apex/tree';
import { AnonApexBenchmark, AnonApexBenchmarkFactory } from '../anon';
import { LimitsBenchmarkOptions } from '../limits';
import { LegacyAnonApexBenchmark } from './legacy';
import { GovernorLimits, LimitsContext } from './schemas';

export interface LimitsAction {
  name: string;
  context?: LimitsContext;
  // optional start block index (current describe or prev done)
  // optional stop block index (the next describe or done block)
  // wrap start/stop bool
  // add done bool
}
// start/stop presence also validated inline?

export interface LimitsScriptFormat {
  name: string;
  actions: LimitsAction[];
}

const methods = ['benchmark', 'describe', 'start', 'stop', 'done'] as const;
type LimitMethods = MethodCallDictionary<typeof methods>;

const legacyMethods = [
  'getCurrentGovernorLimits',
  'getLimitsDiff',
  'assert',
] as const;
type LegacyMethods = MethodCallDictionary<typeof legacyMethods>;

export class LimitsBenchmarkFactory
  implements
    AnonApexBenchmarkFactory<
      GovernorLimits,
      LimitsContext,
      LimitsBenchmarkOptions
    >
{
  private script: ApexScript;
  private options: LimitsBenchmarkOptions;
  private format: LimitsScriptFormat;

  constructor() {
    this.script = ApexScript.empty();
    this.options = {};
    this.resetFormat();
  }

  create(
    script: ApexScript,
    options: LimitsBenchmarkOptions = {}
  ): AnonApexBenchmark<GovernorLimits, LimitsContext> {
    this.script = script;
    this.options = options;
    this.resetFormat();

    const calls = script.getMethodDictionary([
      ...methods,
      ...legacyMethods,
    ] as const);

    if (this.isLegacy(calls)) {
      return this.createLegacy();
    }

    // loadFormat
    // createLimits
  }

  private loadFormat(calls: LimitMethods): void {
    // different scenarios
    // benchmark - 0/1 item - string - index before 1st describe, must have a describe
    // describe - create action, check next describe index, start/stop/[done] exist in between
    // start - create action, no index range, only 1 allowed, +1 stop, +[done]

    this.format = {
      name: this.loadName(calls),
      actions: this.loadActions(calls),
    };

    // applyOptions
    // validate
  }

  private loadName(calls: LimitMethods): string {
    const { benchmark, describe } = calls;

    if (benchmark.length === 1 && describe.length > 0) {
      const call = benchmark[0];

      if (call.index > describe[0].index) {
        throw new Error('benchmark() must be before describe calls.');
      }

      return this.script.getStringParam(call.node, 0);
    }

    if (!benchmark.length != !describe.length) {
      throw new Error(
        'Must have benchmark() with one or many describe() calls.'
      );
    }

    return '';
  }

  private loadActions(calls: LimitMethods): LimitsAction[] {
    // describe - create action, check next describe index, start/stop/[done] exist in between
    // start - create action, no index range, only 1 allowed, +1 stop, +[done]

    return [];
  }

  private resetFormat(): void {
    this.format = {
      name: '',
      actions: [],
    };
  }

  private isLegacy(calls: LegacyMethods): boolean {
    // TODO improve - assume it is a legacy script if any of these are true
    // but throw validation errors if the other parts are missing
    // pass script - helper func for arg lookups
    return (
      // has a limit diff step
      calls.getCurrentGovernorLimits.length > 0 &&
      calls.getLimitsDiff.length > 0 &&
      // and asserts the data
      calls.assert.some(({ node }) => {
        try {
          return (
            // asserts false
            !this.script.getBooleanParam(node, 0) &&
            // and contains the expected serialize chars
            this.script.getExpressionParam(node, 1).includes(`'-_'`)
          );
        } catch {
          return false; // ignore unexpected param
        }
      })
    );
  }

  private createLegacy(): LegacyAnonApexBenchmark {
    this.applyOptions();
    // this.validate()
    const { name: action, context } = this.format.actions[0];
    return new LegacyAnonApexBenchmark(this.format.name, this.script.source, {
      action,
      context,
      hasAssertionResult: true,
    });
  }

  private applyOptions(): void {
    // set id / context override for single action files or code
    if (this.options.id) {
      if (this.script.file && !this.script.file.exclusive) {
        // TODO ScriptError
        throw new Error('Cannot set id option for multiple files.');
      }
      if (this.format.actions.length > 1) {
        throw new Error('Cannot set id option for multiple actions.');
      }

      const { id, context } = this.options;
      this.format = {
        name: id.name,
        actions: [{ name: id.action, context }],
      };
    }
  }
}
