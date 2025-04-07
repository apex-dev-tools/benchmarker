/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { DebugLogInfo } from '../../org/soap/debug';
import {
  Benchmark,
  BenchmarkParams,
  BenchmarkResult,
  ErrorResult,
} from '../base';
import { Connection } from '@salesforce/core';
import { benchmarkSchema, GovernorLimits } from '../schemas';
import {
  executeAnonymous,
  assertAnonymousError,
  extractAssertionData,
} from '../../org/execute';
import { ExecuteAnonymousResponse } from '../../org/soap/executeAnonymous';

export interface AnonApexBenchmarkParams extends BenchmarkParams {
  code: string;
  connection: Connection;
  debug?: DebugLogInfo[];
}

export interface AnonApexTransaction {
  action: string;
  apexCode: string;
  type: AnonApexTransactionType;
}

export enum AnonApexTransactionType {
  Data,
  Execute,
}

export interface AnonApexBenchmarkResult extends BenchmarkResult {
  limits: GovernorLimits;
}

/**
 * Standard benchmark, with optional start/stop calls in apex. If not
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
export class AnonApexBenchmark extends Benchmark<
  AnonApexBenchmarkParams,
  AnonApexBenchmarkResult
> {
  protected transactions: AnonApexTransaction[] = [];

  /**
   * Prepares an Anonymous Apex script for run. Injects required framework
   * code. Optionally splits into multiple transactions.
   */
  async prepare(actions?: string[]): Promise<void> {
    const code = this.params.code;

    let content;
    if (!code.includes('benchmark.start(')) {
      content = 'benchmark.start();';
    }
    if (!code.includes('benchmark.stop(')) {
      content += code + 'benchmark.stop();';
    }

    this.transactions = [
      {
        action: (actions && actions[0]) || '1',
        apexCode:
          require('../../../scripts/apex/limits.apex') +
          require('../../../scripts/apex/benchmark.apex') +
          'benchmark.begin();' +
          content +
          'benchmark.end();',
        type: AnonApexTransactionType.Data,
      },
    ];
  }

  /**
   * Execute Anonymous Apex transactions and accumulate results and errors.
   */
  async run(): Promise<void> {
    this.reset();

    for (const transaction of this.transactions) {
      if (this._errors.length != 0) {
        break;
      }

      try {
        const response = await executeAnonymous(
          this.params.connection,
          transaction.apexCode,
          this.params.debug
        );

        if (transaction.type === AnonApexTransactionType.Data) {
          this._results.push(this.toBenchmarkResult(response, transaction));
        } else {
          // for other transaction types, treat errors normally
          // and halt benchmarking
          const err = assertAnonymousError(response);
          if (err) {
            throw err;
          }
        }
      } catch (e) {
        this._errors.push(this.toErrorResult(e, transaction));
      }
    }
  }

  protected toBenchmarkResult(
    response: ExecuteAnonymousResponse,
    transaction: AnonApexTransaction
  ): AnonApexBenchmarkResult {
    const benchmark = extractAssertionData(response, benchmarkSchema);

    if (!benchmark.limits) {
      throw new Error('Apex did not collect limits usage.');
    }

    // replace default name (i.e. file name)
    // and default action
    if (benchmark.name) {
      this.name = benchmark.name;
    }
    if (benchmark.action) {
      transaction.action = benchmark.action;
    }

    return {
      name: this.name,
      action: transaction.action,
      limits: benchmark.limits,
    };
  }

  protected toErrorResult(
    e: unknown,
    transaction: AnonApexTransaction
  ): ErrorResult {
    return {
      name: this.name,
      action: transaction.action,
      error: e instanceof Error ? e : new Error(`${e}`),
    };
  }
}
