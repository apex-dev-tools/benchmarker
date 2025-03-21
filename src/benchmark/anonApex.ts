/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { DebugLogInfo } from '../soap/debug';
import {
  Benchmark,
  BenchmarkParams,
  BenchmarkResult,
  ErrorResult,
} from './base';
import { Connection } from '@salesforce/core';
import { GovernorLimits } from './schemas';
import {
  execResponseAsError,
  executeAnonymous,
  ExecuteAnonymousResponse,
} from '../soap/executeAnonymous';
import { validate } from '../text/json';

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
  TestCase,
  Execute,
}

export interface AnonApexBenchmarkResult extends BenchmarkResult {
  limits: GovernorLimits;
}

/**
 * Standard test, with optional start/stop calls in apex. If not
 * present, the whole script is assumed to be a test and the code is
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
  protected static resultPattern = /-_(.*)_-/;
  protected transactions: AnonApexTransaction[];

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
        type: AnonApexTransactionType.TestCase,
      },
    ];
  }

  /**
   * Execute Anonymous Apex transactions and accumulate results and errors.
   */
  async run(): Promise<void> {
    let abortError: ErrorResult | undefined;
    for (const transaction of this.transactions) {
      if (abortError) {
        this._errors.push(this.abortTransaction(transaction, abortError));
        continue;
      }

      const response = await executeAnonymous(
        this.params.connection,
        transaction.apexCode,
        this.params.debug
      );

      abortError = this.handleResponse(response, transaction);
    }
  }

  /**
   * Process Anonymous Apex response into a result based on transaction type.
   * For certain transactions, result can be skipped if there is nothing to
   * report.
   *
   * If an error result is returned, this aborts all remaining transactions.
   */
  protected handleResponse(
    execResponse: ExecuteAnonymousResponse,
    transaction: AnonApexTransaction
  ): ErrorResult | undefined {
    const error = execResponseAsError(execResponse);

    let abort = false;
    let benchResult: AnonApexBenchmarkResult | undefined;
    let errorResult: ErrorResult | undefined;

    if (transaction.type === AnonApexTransactionType.TestCase) {
      if (execResponse.compiled && error) {
        // Transaction likely "succeeded"
        benchResult = this.buildBenchmarkResult(error.message, transaction);
      }

      if (!error) {
        errorResult = {
          message: 'Unable to parse Anonymous Apex response.',
          name: this.name,
          action: transaction.action,
        };
      }
    } else if (transaction.type === AnonApexTransactionType.Execute && error) {
      abort = true;
    }

    if (!benchResult && error) {
      errorResult = {
        ...error,
        name: this.name,
        action: transaction.action,
      };
    }

    benchResult && this._results.push(benchResult);
    errorResult && this._errors.push(errorResult);

    return abort ? errorResult : undefined;
  }

  protected buildBenchmarkResult(
    data: string,
    transaction: AnonApexTransaction
  ): AnonApexBenchmarkResult | undefined {
    const resMatch = data.match(AnonApexBenchmark.resultPattern);
    const json = resMatch && JSON.parse(resMatch[1]);
    const benchmark = validate('benchmark', json);

    if (benchmark) {
      // replace default name (i.e. file name)
      // and default action
      if (benchmark.name) {
        this.name = benchmark.name;
      }
      if (benchmark.action) {
        transaction.action = benchmark.action;
      }

      if (benchmark.limits) {
        return {
          name: this.name,
          action: transaction.action,
          limits: benchmark.limits,
        };
      }
    }
    return undefined;
  }

  private abortTransaction(
    transaction: AnonApexTransaction,
    prevError: ErrorResult
  ): ErrorResult {
    return {
      ...prevError,
      action: transaction.action,
      message: `Transaction aborted due to previous error on '${prevError.action}': ${prevError.message}`,
    };
  }
}
