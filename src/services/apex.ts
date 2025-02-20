/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { SalesforceConnection } from './salesforce/connection';
import { replaceTokensInString, TokenReplacement } from './tokenReplacement';
import { ErrorResult } from './benchmark/base';
import {
  AnonApexBenchmark,
  AnonApexBenchmarkParams,
  AnonApexBenchmarkResult,
} from './benchmark/anonApex';
import { LegacyAnonApexBenchmark } from './benchmark/legacy';

export interface ApexBenchmarkServiceOptions {}

export interface ApexBenchmarkOptions {
  /**
   * Map of string value replacement applied on Apex code.
   *
   * @example
   * tokens: [{ token: '%var', value: '100' }]
   * // Integer i = %var; -> Integer i = 100;
   */
  tokens?: TokenReplacement[];
  /**
   * List of namespaces to be removed from any Apex code.
   *
   * Removes the need to write separate benchmark scripts for managed and
   * unmanaged executions.
   */
  unmanagedNamespaces?: string[];
}

export interface ApexBenchmarkCodeOptions extends ApexBenchmarkOptions {
  /**
   * Name to identify the benchmark run in final results.
   */
  benchmarkName: string;
  /**
   * For traceability - define an action name for each step that will be
   * executed (e.g. test case definitions). This will be matched to each
   * transaction executed.
   *
   * This value should preferably be set in the apex script with
   * `benchmark.start('action taken')` or `benchmark.setAction()`.
   *
   * If left undefined - actions will be named by their index starting from 1.
   */
  benchmarkActions?: string[];
}

export interface ApexBenchmarkResult {
  benchmarks: AnonApexBenchmarkResult[];
  errors: ErrorResult[];
}

export class ApexBenchmarkService {
  private connection: SalesforceConnection;
  //private options: ApexBenchmarkServiceOptions;

  constructor(
    connection: SalesforceConnection
    //options?: ApexBenchmarkServiceOptions
  ) {
    this.connection = connection;
    //this.options = options || {};
  }

  /**
   * Run a benchmark for an apex file, or all apex files under the specified
   * directory path.
   */
  async benchmark(
    apexPath: string,
    options?: ApexBenchmarkOptions
  ): Promise<ApexBenchmarkResult> {
    const { root, paths } = await this.loadFromPath(apexPath);

    const benchmarks: AnonApexBenchmark[] = [];
    for (const apexfile of paths) {
      const apex = await fs.readFile(apexfile, { encoding: 'utf8' });

      const benchmark = await this.runApexBenchmark(apex, {
        ...options,
        benchmarkName: path.basename(path.relative(root, apexfile), '.apex'),
      });

      benchmarks.push(benchmark);
    }

    return this.mergeResults(benchmarks);
  }

  /**
   * Run a benchmark on Anonymous Apex code.
   */
  async benchmarkCode(
    apexCode: string,
    options: ApexBenchmarkCodeOptions
  ): Promise<ApexBenchmarkResult> {
    const benchmark = await this.runApexBenchmark(apexCode, options);

    return {
      benchmarks: benchmark.results(),
      errors: benchmark.errors(),
    };
  }

  private async runApexBenchmark(
    code: string,
    options: ApexBenchmarkCodeOptions
  ): Promise<AnonApexBenchmark> {
    const benchmark = this.createAnonApexBenchmark(options.benchmarkName, {
      code: replaceTokensInString(code, options?.tokens),
      connection: this.connection,
    });

    await benchmark.prepare(options.benchmarkActions);
    await benchmark.run();

    return benchmark;
  }

  private createAnonApexBenchmark(
    name: string,
    params: AnonApexBenchmarkParams
  ): AnonApexBenchmark {
    if (
      params.code.includes('new GovernorLimits()') &&
      params.code.includes("System.assert(false, '-_'")
    ) {
      return new LegacyAnonApexBenchmark(name, params);
    }

    return new AnonApexBenchmark(name, params);
  }

  private async loadFromPath(
    pathStr: string
  ): Promise<{ root: string; paths: string[] }> {
    const absPath = path.resolve(pathStr);
    const stat = await fs.stat(absPath);

    if (stat.isFile()) {
      if (this.isApex(absPath)) {
        return {
          root: path.dirname(absPath),
          paths: [absPath],
        };
      }
      throw new Error(`${absPath} is not a directory or ".apex" file.`);
    }

    const entries = await fs.readdir(absPath, {
      withFileTypes: true,
      recursive: true,
    });

    const paths = entries
      .filter(ent => ent.isFile() && this.isApex(ent.name))
      .map(e => e.parentPath + e.name);

    if (paths.length == 0) {
      throw new Error('No ".apex" files found, check path is correct.');
    }

    return {
      root: absPath,
      paths,
    };
  }

  private isApex(pathStr: string): boolean {
    return path.extname(pathStr).toLowerCase() === '.apex';
  }

  private mergeResults(runs: AnonApexBenchmark[]): ApexBenchmarkResult {
    return runs.reduce(
      (acc, curr) => ({
        benchmarks: acc.benchmarks.concat(curr.results()),
        errors: acc.errors.concat(curr.errors()),
      }),
      { benchmarks: [], errors: [] } as ApexBenchmarkResult
    );
  }
}
