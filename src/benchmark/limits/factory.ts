/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  ApexScript,
  type MethodCallDictionary,
  type MethodCallGroups,
} from '../../parser/apex/script.js';
import type { AnonApexBenchmark, AnonApexBenchmarkFactory } from '../anon.js';
import {
  LimitsAnonApexBenchmark,
  type LimitsBenchmarkOptions,
} from '../limits.js';
import { LegacyAnonApexBenchmark } from './legacy.js';
import type { GovernorLimits, LimitsContext } from './schemas.js';

export interface LimitsAction {
  name: string;
  context?: LimitsContext;
  // optional start block index (current describe, or prev done+1)
  blockBeginIndex?: number;
  // optional stop block index (the next describe-1 or done block)
  blockEndIndex?: number;
  // wrap start/stop bool
  needsWrapping?: boolean;
  // add done bool
  needsEnding?: boolean;
}

export interface LimitsScriptFormat {
  name: string;
  actions: LimitsAction[];
  // first describe - 1
  headerEndIndex?: number;
}

const limitMethodNames = [
  'benchmark',
  'describe',
  'start',
  'stop',
  'done',
] as const;
type LimitMethods = MethodCallDictionary<typeof limitMethodNames>;

const legacyMethodNames = [
  'getCurrentGovernorLimits',
  'getLimitsDiff',
  'assert',
] as const;
type LegacyMethods = MethodCallDictionary<typeof legacyMethodNames>;

export class LimitsBenchmarkFactory
  implements
    AnonApexBenchmarkFactory<
      GovernorLimits,
      LimitsContext,
      LimitsBenchmarkOptions
    >
{
  private script: ApexScript;
  private format: LimitsScriptFormat;
  private options: LimitsBenchmarkOptions;

  constructor() {
    this.script = ApexScript.empty();
    this.resetFormat();
    this.options = {};
  }

  create(
    script: ApexScript,
    options: LimitsBenchmarkOptions = {}
  ): AnonApexBenchmark<GovernorLimits, LimitsContext> {
    this.script = script;
    this.options = options;
    this.resetFormat();

    const methods = script.getMethodCalls();
    // coincidental that all legacy methods are ref based
    // and new ones are not
    const legacyCalls = script.toMethodDictionary(
      methods.external,
      legacyMethodNames
    );

    if (this.isLegacy(legacyCalls)) {
      this.applyOptions();
      this.validate();
      return new LegacyAnonApexBenchmark(
        this.script,
        this.format,
        this.options
      );
    }

    this.loadFormat(methods);
    return new LimitsAnonApexBenchmark(this.script, this.format, this.options);
  }

  private loadFormat(groups: MethodCallGroups): void {
    const calls = this.script.toMethodDictionary(
      groups.local,
      limitMethodNames
    );

    this.format = {
      ...this.loadDefinition(calls),
      actions: this.loadActions(calls),
    };

    this.applyOptions();
    this.validate();
  }

  private loadDefinition(calls: LimitMethods): LimitsScriptFormat {
    const { benchmark, describe } = calls;

    if (benchmark.length === 1 && describe.length > 0) {
      const call = benchmark[0];
      const desc = describe[0];
      this.script.assertMethodCallOrder(call, desc);

      return {
        name: this.script.getStringParam(call.node, 0),
        headerEndIndex: desc.index - 1, // header is upto first action for now
        actions: [],
      };
    }

    if (!benchmark.length != !describe.length) {
      throw new Error(
        'Must have benchmark() with one or more describe() calls.'
      );
    }

    return {
      name: '',
      actions: [],
    };
  }

  private loadActions(calls: LimitMethods): LimitsAction[] {
    // describe - create action, check next describe index, start/stop/[done] exist in between
    // start - create action, no index range, only 1 allowed, +1 stop, +[done]
    if (!calls.describe.length) {
      return this.loadStartStopAction(calls);
    }

    const { describe, start, stop, done } = calls;

    return describe.map(({ node, index }, callIndex) => {
      const nextBlock = describe.at(callIndex + 1)?.index;
      const nextStart = this.script.getBlockInRange(start, index, nextBlock);
      const nextStop = this.script.getBlockInRange(stop, index, nextBlock);

      if (!nextStart || !nextStop) {
        throw new Error('Missing start()/stop() in describe block.');
      }

      const nextDone = this.script.getBlockInRange(done, index, nextBlock);

      if (nextDone) {
        this.script.assertMethodCallOrder(nextStart, nextStop, nextDone);
      }

      return {
        name: this.script.getStringParam(node, 0),
        blockBeginIndex: index,
        blockEndIndex:
          nextDone?.index ?? (nextBlock != null ? nextBlock - 1 : nextBlock),
        needsEnding: !nextDone,
      };
    });
  }

  private loadStartStopAction(calls: LimitMethods): LimitsAction[] {
    // no describe - start/stop only
    // must be max 1 of each, must be in right order
    const { start, stop, done } = calls;
    const startLen = start.length;
    const stopLen = stop.length;

    if (!startLen != !stopLen || startLen > 1 || stopLen > 1) {
      throw new Error(
        'Can only have one start() and stop() call when not using describe().'
      );
    } else if (startLen) {
      this.script.assertMethodCallOrder(start[0], stop[0]);
    }

    return [
      {
        name: '',
        needsWrapping: !startLen,
        needsEnding: !done.length,
      },
    ];
  }

  private isLegacy(calls: LegacyMethods): boolean {
    return (
      // has at least one limit diff step
      calls.getCurrentGovernorLimits.length >= 2 &&
      calls.getLimitsDiff.length >= 1 &&
      // and asserts the data
      calls.assert.some(({ node }) => {
        try {
          return (
            // asserts false
            !this.script.getBooleanParam(node, 0) &&
            // and contains the expected serialize chars
            this.script.getExpressionParam(node, 1).includes("'-_'")
          );
        } catch {
          return false; // ignore unexpected param type errors
        }
      })
    );
  }

  private resetFormat(): void {
    this.format = {
      name: '',
      actions: [],
    };
  }

  private applyOptions(): void {
    // set id / context override for single action files or code
    if (this.options.id) {
      if (this.script.file && !this.script.file.exclusive) {
        throw new Error('Cannot set id option for multiple files.');
      }
      if (this.format.actions.length > 1) {
        throw new Error('Cannot set id option for multiple actions.');
      }

      const { id, context } = this.options;
      const action = this.format.actions[0];
      this.format = {
        name: id.name,
        actions: [{ ...action, name: id.action, context }],
      };
    }
  }

  private validate(): void {
    const { name, actions } = this.format;
    if (name.length === 0) {
      throw new Error('Benchmark name is not set in the script or options.');
    }
    actions.forEach(({ name }) => {
      if (name.length === 0) {
        throw new Error('Action name is not set in the script or options.');
      }
    });
  }
}
