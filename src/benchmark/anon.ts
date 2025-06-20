/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  Benchmark,
  BenchmarkAction,
  BenchmarkResult,
  ErrorResult,
} from './base';
import {
  executeAnonymous,
  assertAnonymousError,
  extractAssertionData,
  ExecuteAnonymousOptions,
} from '../salesforce/execute';
import { ExecuteAnonymousResponse } from '../salesforce/soap/executeAnonymous';
import { RunContext } from '../state/context';
import { NamedSchema } from '../parser/json';

export interface AnonApexTransaction<C> {
  action: AnonApexAction<C>;
  apexCode: string;
  type: AnonApexTransactionType;
  executeAnonymous?: ExecuteAnonymousOptions;
}

export enum AnonApexTransactionType {
  Data,
  Execute,
}

export interface AnonApexAction<C> extends BenchmarkAction {
  context?: C;
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
  name: string;
  protected transactions: AnonApexTransaction<C>[];
  protected dataSchema: NamedSchema<T>;
  protected contextSchema: NamedSchema<C>;

  constructor(
    name: string,
    dataSchema: NamedSchema<T>,
    contextSchema: NamedSchema<C>,
    transactions: AnonApexTransaction<C>[]
  ) {
    super();
    this.name = name;
    this.dataSchema = dataSchema;
    this.contextSchema = contextSchema;
    this.transactions = transactions;
  }

  /**
   * Execute Anonymous Apex transactions and accumulate results and errors.
   */
  async run(): Promise<void> {
    this.reset();

    for (const transaction of this.transactions) {
      try {
        const response = await executeAnonymous(
          RunContext.current.org.connection,
          transaction.apexCode,
          transaction.executeAnonymous
        );

        if (transaction.type === AnonApexTransactionType.Data) {
          this._results.push(this.toBenchmarkResult(response, transaction));
        } else {
          // for other transaction types, treat errors normally
          const err = assertAnonymousError(response);
          if (err) throw err;
        }
      } catch (e) {
        this._errors.push(this.toErrorResult(e, transaction));
      }
    }
  }

  protected toBenchmarkResult(
    response: ExecuteAnonymousResponse,
    transaction: AnonApexTransaction<C>
  ): AnonApexBenchmarkResult<T, C> {
    // TODO create { data, context } schema
    return {
      name: this.name,
      action: transaction.action,
      data: extractAssertionData(response, this.dataSchema),
    };
  }

  protected toErrorResult(
    e: unknown,
    transaction: AnonApexTransaction<C>
  ): ErrorResult {
    return {
      id: {
        name: this.name,
        actionName: transaction.action.name,
      },
      error: e instanceof Error ? e : new Error(`${e}`),
    };
  }
}
