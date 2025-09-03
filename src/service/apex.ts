/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type {
  AnonApexBenchmarkFactory,
  AnonApexBenchmarkResult,
} from "../benchmark/anon.js";
import { Benchmark, type ErrorResult } from "../benchmark/base.js";
import type { LimitsBenchmarkOptions } from "../benchmark/limits.js";
import { LimitsBenchmarkFactory } from "../benchmark/limits/factory.js";
import type {
  GovernorLimits,
  LimitsContext,
} from "../benchmark/limits/schemas.js";
import { ErrorReporter } from "../display/error.js";
import {
  LimitsReporter,
  type LimitsReporterOptions,
} from "../display/limits.js";
import { Logger } from "../display/logger.js";
import {
  LimitsMetricProvider,
  type LimitsMetric,
  type LimitsMetricProviderOptions,
} from "../metrics/limits.js";
import type { Degradation } from "../metrics/limits/deg.js";
import type { ApexScriptParserOptions } from "../parser/apex.js";
import {
  executeAnonymous,
  type ExecuteAnonymousOptions,
} from "../salesforce/execute.js";
import type { ExecuteAnonymousResponse } from "../salesforce/soap/executeAnonymous.js";
import { RunContext, type RunContextOptions } from "../state/context.js";
import { RunStore } from "../state/store.js";
import {
  AnonApexBenchmarker,
  type AnonApexBenchmarkerRequest,
  type AnonApexBenchmarkRun,
} from "./apex/runner.js";

export interface ApexBenchmarkServiceOptions extends RunContextOptions {
  limitsMetrics?: LimitsMetricProviderOptions;
  limitsReporter?: LimitsReporterOptions;
  useLegacySchema?: boolean;
}

export interface LimitsMetrics {
  deg?: LimitsMetric<Degradation>;
}

export type LimitsBenchmarker = AnonApexBenchmarker<
  GovernorLimits,
  LimitsContext,
  LimitsBenchmarkOptions
>;

export type LimitsBenchmarkRequest =
  AnonApexBenchmarkerRequest<LimitsBenchmarkOptions>;

export type LimitsBenchmarkResult = AnonApexBenchmarkResult<
  GovernorLimits,
  LimitsContext
> &
  LimitsMetrics;

export interface LimitsBenchmarkRun {
  benchmarks: LimitsBenchmarkResult[];
  errors: ErrorResult[];
}

let defaultService: ApexBenchmarkService | undefined;

export class ApexBenchmarkService {
  protected setupCalled: boolean = false;
  protected limitsStore: RunStore<LimitsBenchmarkResult>;
  protected limitsBenchmarker: LimitsBenchmarker;
  protected limitsMetrics: LimitsMetricProvider;
  protected limitsReporter: LimitsReporter;
  protected errorReporter: ErrorReporter;

  constructor() {
    this.limitsStore = new RunStore();
    this.limitsBenchmarker = new AnonApexBenchmarker(
      new LimitsBenchmarkFactory()
    );
    this.limitsMetrics = new LimitsMetricProvider();
    this.limitsReporter = new LimitsReporter();
    this.errorReporter = new ErrorReporter();
  }

  static get default(): ApexBenchmarkService {
    if (!defaultService) defaultService = new ApexBenchmarkService();
    return defaultService;
  }

  /**
   * Customise behaviour of the benchmarking service.
   */
  async setup(options: ApexBenchmarkServiceOptions = {}): Promise<void> {
    this.setupCalled = true;
    const run = RunContext.current;

    await run.setup(options);

    // include legacy schema mapping by default
    const legacyEnv = process.env.BENCH_POSTGRES_LEGACY;
    if (options.useLegacySchema ?? (Boolean(legacyEnv) || legacyEnv == null)) {
      await run.setupPgLegacy(options.pg);
    }

    this.limitsMetrics.setup(options.limitsMetrics);
    this.limitsReporter.setup(options.limitsReporter);
  }

  restore() {
    RunContext.reset();
    this.limitsStore = new RunStore();
    this.setupCalled = false;
  }

  /**
   * Run benchmark(s) for governor limits on an apex file.
   * Applies metrics to results if enabled.
   *
   * @param path Path to a ".apex" file containing one or more actions.
   * @param options Set options the benchmark name, context when using basic
   * format. Or enable debug logging.
   * @param parserOptions
   * @returns Grouped results and errors from all benchmark actions.
   */
  async benchmarkFileLimits(
    path: string,
    options?: LimitsBenchmarkOptions,
    parserOptions?: ApexScriptParserOptions
  ): Promise<LimitsBenchmarkRun> {
    return this.benchmarkLimits({
      paths: [path],
      options,
      parserOptions: { ...parserOptions, filesOnly: true },
    });
  }

  /**
   * Run benchmark for governor limits on requested apex code or paths.
   * Applies metrics to results if enabled.
   *
   * @param request Set either `code` or `paths` together with any options to
   * customise the benchmark. Some benchmark options may not be applicable when used
   * with multiple paths or directories.
   * @returns Grouped results and errors from all requested benchmarks.
   */
  async benchmarkLimits(
    request: LimitsBenchmarkRequest
  ): Promise<LimitsBenchmarkRun> {
    await this.ensureSetup();

    Logger.info("Benchmark requested.", request);

    const run = await this.limitsBenchmarker.runBenchmark(request);
    const { benchmarks, errors } = await this.postProcessResults(run);

    this.limitsStore.addItems(benchmarks);
    this.errorReporter.run(errors);

    return { benchmarks, errors };
  }

  /**
   * Sync current stored limits results to configured data sources. Returns
   * saved results.
   */
  async saveLimits(): Promise<LimitsBenchmarkResult[]> {
    const run = RunContext.current;
    const results = this.limitsStore.getItemsFromCursor();
    const mappers = run.getCommonMappers();

    if (results.length === 0 || mappers.length === 0) return results;

    const orgContext = await run.org.getContext();

    Logger.info(`Saving ${results.length} results to connected datasources.`);
    for (const mapper of mappers) {
      await mapper.saveLimitsResults(run, orgContext, results);
    }

    this.limitsStore.moveCursor();
    return results;
  }

  /**
   * Display limits results according to defined reporter options.
   */
  reportLimits(results?: LimitsBenchmarkResult[]): void {
    this.limitsReporter.run(results ? results : this.limitsStore.getItems());
  }

  /**
   * Create a custom anonymous benchmark runner using the provided factory.
   *
   * @param factory On calls to create, receives the parsed apex script and
   * request options and should return benchmark instances.
   */
  async customAnonApexBenchmarker<Data, Context, Options>(
    factory: AnonApexBenchmarkFactory<Data, Context, Options>
  ): Promise<AnonApexBenchmarker<Data, Context, Options>> {
    await this.ensureSetup();
    return new AnonApexBenchmarker(factory);
  }

  /**
   * Execute Anonymous Apex on the current org, with namespaces replaced if
   * enabled.
   *
   * Optionally enable and return Apex debug logs.
   */
  async execute(
    code: string,
    options?: ExecuteAnonymousOptions
  ): Promise<ExecuteAnonymousResponse> {
    const ctx = await this.ensureSetup();

    return executeAnonymous(
      ctx.org.connection,
      ctx.org.removeUnmanagedNamespaces(code),
      options
    );
  }

  private async ensureSetup(): Promise<RunContext> {
    if (!this.setupCalled) await this.setup();
    return RunContext.current;
  }

  private async postProcessResults(
    input: AnonApexBenchmarkRun<GovernorLimits, LimitsContext>
  ): Promise<LimitsBenchmarkRun> {
    let benchmarks: LimitsBenchmarkResult[] = input.benchmarks;
    const errors: ErrorResult[] = [...input.errors];

    try {
      benchmarks = await this.limitsMetrics.calculate(input.benchmarks);
      // TODO optional limitMetrics.validate / produce errors
    } catch (e) {
      errors.push(Benchmark.coerceError(e));
    }

    return { benchmarks, errors };
  }
}
