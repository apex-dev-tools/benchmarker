/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import path from 'node:path';
import { ErrorResult } from '../benchmark/base';
import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
} from '../benchmark/apex/anon';
import {
  ApexBenchmarkOptions,
  createAnonApexBenchmark,
} from '../benchmark/apex';
import { Connection } from '@salesforce/core';
import {
  connectToSalesforceOrg,
  getSalesforceAuthInfoFromEnvVars,
} from '../services/salesforce/connection';
import {
  findApexInDir,
  readApex,
  readApexFromFile,
  resolveApexPath,
} from './apex/source';

export interface ApexBenchmarkServiceOptions {
  connection: Connection;
}

export interface SingleApexBenchmarkOptions extends ApexBenchmarkOptions {
  /**
   * Name to identify the benchmark run in final results.
   */
  name: string;
  /**
   * For traceability, describe each transaction in the benchmark.
   * If left undefined - actions will be named by their index starting from 1.
   */
  actions?: string[];
}

export interface ApexBenchmarkResult {
  benchmarks: AnonApexBenchmarkResult[];
  errors: ErrorResult[];
}

export class ApexBenchmarkService {
  private _options: ApexBenchmarkServiceOptions | undefined;

  /**
   * Customise global behaviour of the benchmarking service.
   */
  async setup(
    options?: Partial<ApexBenchmarkServiceOptions>
  ): Promise<ApexBenchmarkServiceOptions> {
    const connection: Connection =
      options?.connection ||
      (await connectToSalesforceOrg(getSalesforceAuthInfoFromEnvVars()));

    this._options = {
      connection,
    };

    return this._options;
  }

  /**
   * Run benchmarks for all apex files under the specified directory path.
   *
   * @param apexPath Path to directory containing ".apex" files.
   * @param options Additional options to customise the benchmark.
   * @returns A merged list of results from all identified benchmarks.
   */
  async benchmarkDirectory(
    apexPath: string,
    options?: ApexBenchmarkOptions
  ): Promise<ApexBenchmarkResult> {
    const opts = await this.ensureSetup();
    const { root, paths } = await findApexInDir(apexPath);

    const results: ApexBenchmarkResult[] = [];
    for (const apexfile of paths) {
      const name = path.relative(root, apexfile).replace('.apex', '');
      const benchmark = createAnonApexBenchmark(name, {
        code: await readApexFromFile(apexfile, options),
        connection: opts.connection,
      });

      await benchmark.prepare();

      const result = await this.runBenchmark(benchmark);

      results.push(result);
    }

    return this.mergeResults(results);
  }

  /**
   * Run a benchmark for a single apex file.
   *
   * @param apexFilePath Path to ".apex" file containing benchmark script.
   * @param options Additional options to customise the benchmark.
   * @returns An object with reported results and errors.
   */
  async benchmarkFile(
    apexFilePath: string,
    options?: SingleApexBenchmarkOptions
  ): Promise<ApexBenchmarkResult> {
    const absPath = await resolveApexPath(apexFilePath);
    const code = await readApexFromFile(absPath, options);

    return this.benchmarkCode(code, {
      ...options,
      name: options?.name || path.basename(absPath, '.apex'),
    });
  }

  /**
   * Run a benchmark on Anonymous Apex code.
   *
   * @param name An identifier used in results.
   * @param apexCode Apex code to be benchmarked. Supports different formats.
   * @param options Additional options to customise the benchmark.
   * @returns An object with reported results and errors.
   */
  async benchmarkCode(
    apexCode: string,
    options: SingleApexBenchmarkOptions
  ): Promise<ApexBenchmarkResult> {
    const opts = await this.ensureSetup();
    const benchmark = createAnonApexBenchmark(options.name, {
      code: await readApex(apexCode, options),
      connection: opts.connection,
    });

    await benchmark.prepare(options?.actions);

    return this.runBenchmark(benchmark);
  }

  private async ensureSetup(): Promise<ApexBenchmarkServiceOptions> {
    if (!this._options) {
      return await this.setup();
    }
    return this._options;
  }

  private async runBenchmark(
    benchmark: AnonApexBenchmark
  ): Promise<ApexBenchmarkResult> {
    await benchmark.run();

    return {
      benchmarks: benchmark.results(),
      errors: benchmark.errors(),
    };
  }

  private mergeResults(runs: ApexBenchmarkResult[]): ApexBenchmarkResult {
    return runs.reduce(
      (acc, curr) => ({
        benchmarks: acc.benchmarks.concat(curr.benchmarks),
        errors: acc.errors.concat(curr.errors),
      }),
      { benchmarks: [], errors: [] } as ApexBenchmarkResult
    );
  }
}
