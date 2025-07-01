/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export interface BenchmarkId {
  name: string;
  action: string;
}

export interface BenchmarkResult extends BenchmarkId {}

export interface ErrorResult {
  benchmark?: BenchmarkId;
  error: Error;
}

export abstract class Benchmark<R extends BenchmarkResult> {
  protected _results: R[];
  protected _errors: ErrorResult[];

  constructor() {
    this._results = [];
  }

  abstract run(): Promise<void>;

  static coerceError(e: unknown): Error {
    const error =
      e instanceof Error
        ? e
        : new Error('Unexpected error not extending Error type.');
    return error;
  }

  results(): R[] {
    return this._results;
  }

  errors(): ErrorResult[] {
    return this._errors;
  }

  protected reset(): void {
    this._results = [];
    this._errors = [];
  }
}
