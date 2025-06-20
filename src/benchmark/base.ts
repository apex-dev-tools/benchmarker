/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export interface BenchmarkAction {
  name: string;
}

export interface BenchmarkResult<A extends BenchmarkAction = BenchmarkAction> {
  name: string;
  action: A;
}

export interface BenchmarkId {
  name: string;
  actionName: string;
}

export interface ErrorResult {
  id?: BenchmarkId;
  error: Error;
}

export abstract class Benchmark<
  A extends BenchmarkAction,
  R extends BenchmarkResult<A>,
> {
  protected _results: R[];
  protected _errors: ErrorResult[];

  constructor() {
    this._results = [];
  }

  abstract run(): Promise<void>;

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
