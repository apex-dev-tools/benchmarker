/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { ExecuteAnonymousResponse } from '@salesforce/apex-node';

export interface Transaction {
  apexCode: string;
  transactionType: TransactionType;
}

export enum TransactionType {
  TestCase,
  Execute,
}

export interface BenchmarkResult {
  timeMs: number;
  limits: BenchmarkLimits;
  suiteName?: string;
  action?: string;
}

export interface ErrorResult {
  compiled: boolean;
  error: string;
}

export interface BenchmarkLimits {
  cpuTime: number;
  dmlRows: number;
  dmlStatements: number;
  heapSize: number;
  queryRows: number;
  soqlQueries: number;
  queueableJobs: number;
  futureCalls: number;
}

abstract class Benchmark {
  protected code: string;

  constructor(code: string) {
    this.code = code;
  }

  /**
   * Prepares an Anonymous Apex script for run. Injects required framework
   * code. Optionally splits into multiple transactions.
   */
  abstract transactions(): Transaction[];

  /**
   * Process Anonymous Apex response into a result based on transaction type.
   * For certain transactions, result can be null if there is nothing to
   * report.
   */
  abstract result(
    execResponse: ExecuteAnonymousResponse,
    type: TransactionType
  ): BenchmarkResult | ErrorResult | null;
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
class SingleBenchmark extends Benchmark {
  transactions(): Transaction[] {
    const apexStart = 'benchmark.start();';
    const apexStop = 'benchmark.stop();';
    const apexEnd = 'benchmark.end();';

    let content;
    if (!this.code.includes(apexStart)) {
      content = apexStart;
    }
    if (!this.code.includes(apexStop)) {
      content += this.code + apexStop;
    }

    return [
      {
        apexCode:
          require('../../../scripts/apex/limits.apex') +
          require('../../../scripts/apex/benchmark.apex') +
          content +
          apexEnd,
        transactionType: TransactionType.TestCase,
      },
    ];
  }

  result(
    execResponse: ExecuteAnonymousResponse,
    type: TransactionType
  ): BenchmarkResult {
    throw new Error('Method not implemented.');
  }
}

/**
 * Old (deprecated) test structure, with manual tracking and return of limits.
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
class LegacyBenchmark extends Benchmark {
  transactions(): Transaction[] {
    return [
      {
        apexCode: require('../../../scripts/apex/limits.apex') + this.code,
        transactionType: TransactionType.TestCase,
      },
    ];
  }

  result(
    execResponse: ExecuteAnonymousResponse,
    type: TransactionType
  ): BenchmarkResult {
    throw new Error('Method not implemented.');
  }
}

/**
 * Matches script format against a benchmark type, defaults to benchmark
 * for the entire script.
 */
export function benchmarkFactory(code: string): Benchmark {
  if (
    code.includes('new GovernorLimits()') &&
    code.includes("System.assert(false, '-_'")
  ) {
    return new LegacyBenchmark(code);
  }

  return new SingleBenchmark(code);
}
