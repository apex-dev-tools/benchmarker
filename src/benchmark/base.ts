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
  message: string;
  stack?: string;
}

export abstract class Benchmark<
  P extends BenchmarkParams,
  R extends BenchmarkResult,
  E extends ErrorResult = ErrorResult,
> {
  public name: string;
  protected params: P;
  protected _results: R[];
  protected _errors: E[];

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

  errors(): E[] {
    return this._errors;
  }

  reset(): void {
    this._results = [];
    this._errors = [];
  }
}
