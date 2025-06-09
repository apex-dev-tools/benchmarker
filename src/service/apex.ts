/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import path from 'node:path';
import { ErrorResult } from '../benchmark/base';
import {
  ApexAction,
  ApexBenchmarkResult,
  createAnonApexBenchmark,
} from '../benchmark/apex';
import {
  findApexInDir,
  readApexFromFile,
  resolveApexPath,
} from './apex/source';
import { RunContext, RunContextOptions } from '../state/context';
import {
  LimitsMetricProvider,
  LimitsMetricProviderOptions,
} from '../metrics/limits';
import { RunStore } from '../state/store';
import { ExecuteAnonymousOptions } from '../salesforce/execute';
import { ApexScriptParser, ApexScriptParserOptions } from '../parser/apex';

export interface ApexBenchmarkServiceOptions extends RunContextOptions {
  limitsMetrics?: LimitsMetricProviderOptions;
  useLegacySchema?: boolean;
}

export interface BenchmarkDirectoryOptions {
  parser?: ApexScriptParserOptions;
  executeAnonymous?: ExecuteAnonymousOptions;
}

export interface BenchmarkSingleOptions {
  name: string;
  actions?: ApexAction[];
  parser?: ApexScriptParserOptions;
  executeAnonymous?: ExecuteAnonymousOptions;
}

export interface BenchmarkDirectoryResult {
  benchmarks: ApexBenchmarkResult[];
  errors: ErrorResult[];
}

export interface BenchmarkSingleResult {
  benchmarks: ApexBenchmarkResult[];
  error?: ErrorResult;
}

export class ApexBenchmarkService {
  protected setupCalled: boolean = false;
  protected store: RunStore<ApexBenchmarkResult>;
  protected scriptParser: ApexScriptParser;
  protected limitsMetrics: LimitsMetricProvider;

  constructor() {
    this.store = new RunStore();
    this.scriptParser = new ApexScriptParser();
    this.limitsMetrics = new LimitsMetricProvider();
  }

  /**
   * Customise behaviour of the benchmarking service.
   */
  async setup(options: ApexBenchmarkServiceOptions = {}): Promise<void> {
    this.setupCalled = true;
    const run = RunContext.current;

    await run.setup(options);

    if (options.useLegacySchema ?? Boolean(process.env.BENCH_POSTGRES_LEGACY)) {
      await run.setupPgLegacy(options.pg);
    }

    this.limitsMetrics.setup(
      run.pgLegacy?.commonMapper || run.pg.commonMapper,
      options.limitsMetrics
    );
  }

  restore() {
    RunContext.reset();
    this.store = new RunStore();
    this.setupCalled = false;
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
    options?: BenchmarkDirectoryOptions
  ): Promise<BenchmarkDirectoryResult> {
    await this.ensureSetup();
    const { parser, ...opts } = options || {};

    this.setupParser(parser);

    const { benchmarks, errors } = await this.runBenchmarksInDir(
      apexPath,
      opts
    );

    return { benchmarks: await this.postProcessResults(benchmarks), errors };
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
    options?: BenchmarkSingleOptions
  ): Promise<BenchmarkSingleResult> {
    const absPath = await resolveApexPath(apexFilePath);
    const code = await readApexFromFile(absPath);

    return this.benchmarkCode(code, {
      ...options,
      name: options?.name || path.basename(absPath, '.apex'),
    });
  }

  /**
   * Run a benchmark on Anonymous Apex code.
   *
   * @param apexCode Apex code to be benchmarked. Supports different formats.
   * @param options Additional options to customise the benchmark.
   * @returns An object with reported results and errors.
   */
  async benchmarkCode(
    apexCode: string,
    options: BenchmarkSingleOptions
  ): Promise<BenchmarkSingleResult> {
    await this.ensureSetup();
    const { parser, ...opts } = options;

    this.setupParser(parser);

    const { benchmarks, error } = await this.runBenchmark(apexCode, opts);

    return { benchmarks: await this.postProcessResults(benchmarks), error };
  }

  /**
   * Sync current stored results to configured data sources.
   */
  async save(): Promise<void> {
    const run = RunContext.current;
    const results = this.store.getItemsFromCursor();

    if (results.length === 0 || !run.isPostgresAvailable()) return;

    const orgContext = await run.org.getContext();

    await run.forPostgres(mapper =>
      mapper.saveApexResults(run, orgContext, results)
    );

    this.store.moveCursor();
  }

  private async ensureSetup(): Promise<RunContext> {
    if (!this.setupCalled) await this.setup();
    return RunContext.current;
  }

  private setupParser(options?: ApexScriptParserOptions): void {
    this.scriptParser.setup(
      RunContext.current.org.getNamespaceRegExp().map(ns => [ns, '']),
      options
    );
  }

  private async runBenchmarksInDir(
    apexPath: string,
    options: BenchmarkDirectoryOptions
  ): Promise<BenchmarkDirectoryResult> {
    const { root, paths } = await findApexInDir(apexPath);

    const results: BenchmarkSingleResult[] = [];
    for (const apexfile of paths) {
      const code = await readApexFromFile(apexfile);
      results.push(
        await this.runBenchmark(code, {
          ...options,
          name: path.relative(root, apexfile).replace('.apex', ''),
        })
      );
    }

    return this.mergeDirResults(results);
  }

  private async runBenchmark(
    code: string,
    options: BenchmarkSingleOptions
  ): Promise<BenchmarkSingleResult> {
    const { actions, ...opts } = options;
    const benchmark = createAnonApexBenchmark({
      ...opts,
      code: this.scriptParser.parse(code),
    });

    await benchmark.prepare(actions);

    await benchmark.run();

    return {
      benchmarks: benchmark.results(),
      error: benchmark.error(),
    };
  }

  private mergeDirResults(
    runs: BenchmarkSingleResult[]
  ): BenchmarkDirectoryResult {
    return runs.reduce(
      (dir, res) => {
        dir.benchmarks.push(...res.benchmarks);
        if (res.error) dir.errors.push(res.error);
        return dir;
      },
      { benchmarks: [], errors: [] } as BenchmarkDirectoryResult
    );
  }

  private async postProcessResults(
    input: ApexBenchmarkResult[]
  ): Promise<ApexBenchmarkResult[]> {
    const benchmarks = await this.limitsMetrics.calculate(input);

    this.store.addItems(benchmarks);

    return benchmarks;
  }
}
