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
import { BenchmarkResponse, GovernorLimits } from './schemas';
import {
  execResponseAsError,
  executeAnonymous,
  ExecuteAnonymousCompileError,
  ExecuteAnonymousError,
  ExecuteAnonymousResponse,
} from '../soap/executeAnonymous';
import { deserialize } from '../text/json';

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
  Benchmark,
  Execute,
}

export interface AnonApexBenchmarkResult extends BenchmarkResult {
  limits: GovernorLimits;
}

export interface AnonApexErrorResult extends ErrorResult {
  compileFailed: boolean;
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
  AnonApexBenchmarkResult,
  AnonApexErrorResult
> {
  protected static resultPattern = /-_(.*)_-/;
  protected transactions: AnonApexTransaction[];
  protected errorCause: AnonApexErrorResult | undefined;

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
          require('../../scripts/apex/limits.apex') +
          require('../../scripts/apex/benchmark.apex') +
          'benchmark.begin();' +
          content +
          'benchmark.end();',
        type: AnonApexTransactionType.Benchmark,
      },
    ];
  }

  /**
   * Execute Anonymous Apex transactions and accumulate results and errors.
   */
  async run(): Promise<void> {
    for (const transaction of this.transactions) {
      if (this.errorCause) {
        this._errors.push(this.abortTransaction(transaction, this.errorCause));
        continue;
      }

      try {
        const response = await executeAnonymous(
          this.params.connection,
          transaction.apexCode,
          this.params.debug
        );

        this.handleResponse(response, transaction);
      } catch (e) {
        const err = this.getErrorResult(e, transaction);
        this._errors.push(err);
        this.errorCause = err;
      }
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
  ): void {
    const error = execResponseAsError(execResponse);

    if (transaction.type === AnonApexTransactionType.Benchmark) {
      if (!error) {
        throw new Error(
          'Apex did not assert false as expected with benchmark result.'
        );
      }

      if (execResponse.compiled) {
        this._results.push(this.getBenchmarkResult(error, transaction));
      } else {
        // compile error - fatal
        throw error;
      }
    } else if (error) {
      // for other transaction types, treat errors normally
      // and halt benchmarking
      throw error;
    }
  }

  protected getBenchmarkResult(
    error: ExecuteAnonymousError,
    transaction: AnonApexTransaction
  ): AnonApexBenchmarkResult {
    const benchmark = this.parseBenchmark(error);

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

  protected getErrorResult(
    e: unknown,
    transaction: AnonApexTransaction
  ): AnonApexErrorResult {
    const res: AnonApexErrorResult = {
      name: this.name,
      action: transaction.action,
      message: 'Unknown error',
      compileFailed: false,
    };

    if (e instanceof ExecuteAnonymousCompileError) {
      res.compileFailed = true;
    }
    if (e instanceof Error) {
      res.message = e.message;
      res.stack = e.stack;
    }

    return res;
  }

  private parseBenchmark(error: ExecuteAnonymousError): BenchmarkResponse {
    const resMatch = error.message.match(AnonApexBenchmark.resultPattern);
    const text = resMatch && resMatch[1];

    if (!text) {
      throw error;
    }

    return deserialize('benchmark', text);
  }

  private abortTransaction(
    transaction: AnonApexTransaction,
    prevError: AnonApexErrorResult
  ): AnonApexErrorResult {
    return {
      ...prevError,
      action: transaction.action,
      message: `Transaction aborted due to previous error on '${prevError.action}': ${prevError.message}`,
    };
  }
}
