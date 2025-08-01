/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { Benchmark, BenchmarkResult, ErrorResult } from './base.js';
import {
  executeAnonymous,
  assertAnonymousError,
  extractAssertionData,
  ExecuteAnonymousOptions,
} from '../salesforce/execute.js';
import { ExecuteAnonymousResponse } from '../salesforce/soap/executeAnonymous.js';
import { RunContext } from '../state/context.js';
import { NamedSchema } from '../parser/json.js';
import { ApexScript } from '../parser/apex/script.js';

export interface AnonApexBenchmarkFactory<T, C, O> {
  create(script: ApexScript, options?: O): AnonApexBenchmark<T, C>;
}

export interface AnonApexTransaction<C> {
  code: string;
  action: string;
  hasAssertionResult: boolean;
  context?: C;
  executeAnonymous?: ExecuteAnonymousOptions;
}

export interface AnonApexBenchmarkResult<T, C> extends BenchmarkResult {
  data: T;
  context?: C;
}

/**
 * Extend to create Anonymous Apex benchmarks that return data `T`.
 * Requires a `NamedSchema<T>` to validate the JSON returned by `System.assert`.
 *
 * Provide context information/config object `C` to be set on prepared transactions.
 * This is also saved to the corresponding results for later use.
 */
export abstract class AnonApexBenchmark<T, C> extends Benchmark<
  AnonApexBenchmarkResult<T, C>
> {
  name: string;
  protected dataSchema: NamedSchema<T>;

  constructor(name: string, dataSchema: NamedSchema<T>) {
    super();
    this.name = name;
    this.dataSchema = dataSchema;
  }

  protected abstract nextTransaction(): Generator<AnonApexTransaction<C>>;

  /**
   * Execute Anonymous Apex transactions and accumulate results and errors.
   */
  async run(): Promise<void> {
    this.reset();

    for (const transaction of this.nextTransaction()) {
      try {
        const response = await executeAnonymous(
          RunContext.current.org.connection,
          transaction.code,
          transaction.executeAnonymous
        );

        if (transaction.hasAssertionResult) {
          // expecting a result to retrieve from the exec response
          this._results.push(this.toBenchmarkResult(response, transaction));
        } else {
          // for other general transactions, treat errors normally
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
    // default result handler, expects assertion in the code:
    // System.assert(false, '-_' + JSON.serialize(data) + '_-');
    return {
      name: this.name,
      action: transaction.action,
      data: extractAssertionData(response, this.dataSchema),
      context: transaction.context,
    };
  }

  protected toErrorResult(
    e: unknown,
    transaction: AnonApexTransaction<C>
  ): ErrorResult {
    return Benchmark.coerceError(e, {
      name: this.name,
      action: transaction.action,
    });
  }
}
