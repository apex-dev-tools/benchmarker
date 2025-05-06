/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  Benchmark,
  BenchmarkAction,
  BenchmarkResult,
  ErrorResult,
} from '../base';
import {
  executeAnonymous,
  assertAnonymousError,
  extractAssertionData,
  ExecuteAnonymousOptions,
} from '../../salesforce/execute';
import { ExecuteAnonymousResponse } from '../../salesforce/soap/executeAnonymous';
import { RunContext } from '../../state/context';
import { NamedSchema } from '../../parser/json';

export interface AnonApexBenchmarkOptions {
  /**
   * Name to identify the benchmark run in final results.
   */
  name: string;

  /**
   * Full apex script to be used in benchmark.
   */
  code: string;

  executeAnonymous?: ExecuteAnonymousOptions;
}

export interface AnonApexTransaction<C> {
  action: AnonApexAction<C>;
  apexCode: string;
  type: AnonApexTransactionType;
}

export enum AnonApexTransactionType {
  Data,
  Execute,
}

export interface AnonApexAction<C> extends BenchmarkAction {
  context?: C;
  executeAnonymous?: ExecuteAnonymousOptions;
}

export interface AnonApexBenchmarkResult<T, C>
  extends BenchmarkResult<AnonApexAction<C>> {
  data: T;
}

/**
 * Extend to create Anonymous Apex benchmarks that return data `T`.
 * Requires a `NamedSchema<T>` to validate the JSON returned by `System.Assert`.
 *
 * Provide context information/config object `C` to be set on prepared actions.
 * This is also saved to the corresponding results for later use.
 */
export abstract class AnonApexBenchmark<T, C> extends Benchmark<
  AnonApexAction<C>,
  AnonApexBenchmarkResult<T, C>
> {
  protected transactions: AnonApexTransaction<C>[] = [];
  protected options: AnonApexBenchmarkOptions;
  protected schema: NamedSchema<T>;

  constructor(options: AnonApexBenchmarkOptions, schema: NamedSchema<T>) {
    super(options.name);
    this.options = options;
    this.schema = schema;
  }

  protected abstract prepareTransactions(
    actions?: AnonApexAction<C>[]
  ): Promise<AnonApexTransaction<C>[]>;

  /**
   * Prepares an Anonymous Apex script for run. Injects required framework
   * code. Optionally splits into multiple transactions.
   *
   * @param actions Override actions configuration in the benchmark.
   */
  async prepare(actions?: AnonApexAction<C>[]): Promise<void> {
    this.transactions = await this.prepareTransactions(actions);
  }

  /**
   * Execute Anonymous Apex transactions and accumulate results and errors.
   */
  async run(): Promise<void> {
    this.reset();

    for (const transaction of this.transactions) {
      if (this._error) {
        break;
      }

      try {
        const response = await executeAnonymous(
          RunContext.current.org.connection,
          transaction.apexCode,
          transaction.action.executeAnonymous || this.options.executeAnonymous
        );

        if (transaction.type === AnonApexTransactionType.Data) {
          this._results.push(this.toBenchmarkResult(response, transaction));
        } else {
          // for other transaction types, treat errors normally
          // and halt benchmarking
          const err = assertAnonymousError(response);
          if (err) throw err;
        }
      } catch (e) {
        this._error = this.toErrorResult(e, transaction);
      }
    }
  }

  protected toBenchmarkResult(
    response: ExecuteAnonymousResponse,
    transaction: AnonApexTransaction<C>
  ): AnonApexBenchmarkResult<T, C> {
    return {
      name: this.name,
      action: transaction.action,
      data: extractAssertionData(response, this.schema),
    };
  }

  protected toErrorResult(
    e: unknown,
    transaction: AnonApexTransaction<C>
  ): ErrorResult {
    return {
      name: this.name,
      actionName: transaction.action.name,
      error: e instanceof Error ? e : new Error(`${e}`),
    };
  }
}
