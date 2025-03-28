/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

export interface BenchmarkParams {}

export interface BenchmarkResult {
  name: string;
  action: string;
}

export interface ErrorResult {
  name: string;
  action: string;
  error: Error;
}

export abstract class Benchmark<
  P extends BenchmarkParams,
  R extends BenchmarkResult,
> {
  public name: string;
  protected params: P;
  protected _results: R[];
  protected _errors: ErrorResult[];

  constructor(name: string, params: P) {
    this.name = name;
    this.params = params;
    this._results = [];
    this._errors = [];
  }

  abstract prepare(actions?: string[]): Promise<void>;

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
