/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export interface BenchmarkAction {
  name: string;
}

export interface BenchmarkResult<A extends BenchmarkAction> {
  name: string;
  action: A;
}

export interface ErrorResult {
  name: string;
  actionName: string;
  error: Error;
}

export abstract class Benchmark<
  A extends BenchmarkAction,
  R extends BenchmarkResult<A>,
> {
  name: string;
  protected _results: R[];
  protected _error?: ErrorResult;

  constructor(name: string) {
    this.name = name;
    this._results = [];
  }

  abstract prepare(actions?: A[]): Promise<void>;

  abstract run(): Promise<void>;

  results(): R[] {
    return this._results;
  }

  error(): ErrorResult | undefined {
    return this._error;
  }

  protected reset(): void {
    this._results = [];
    this._error = undefined;
  }
}
