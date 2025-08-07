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
import {
  LimitsMetricProvider,
  type LimitsMetricProviderOptions,
} from "../metrics/limits.js";
import type { DegLimitsMetric } from "../metrics/limits/deg.js";
import type { ApexScriptParserOptions } from "../parser/apex.js";
import { RunContext, type RunContextOptions } from "../state/context.js";
import { RunStore } from "../state/store.js";
import {
  AnonApexBenchmarker,
  type AnonApexBenchmarkerRequest,
  type AnonApexBenchmarkRun,
} from "./apex/runner.js";

export interface ApexBenchmarkServiceOptions extends RunContextOptions {
  limitsMetrics?: LimitsMetricProviderOptions;
  useLegacySchema?: boolean;
}

export interface LimitsMetrics {
  deg?: DegLimitsMetric;
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

export class ApexBenchmarkService {
  protected setupCalled: boolean = false;
  protected limitsStore: RunStore<LimitsBenchmarkResult>;
  protected limitsBenchmarker: LimitsBenchmarker;
  protected limitsMetrics: LimitsMetricProvider;

  constructor() {
    this.limitsStore = new RunStore();
    this.limitsBenchmarker = new AnonApexBenchmarker(
      new LimitsBenchmarkFactory()
    );
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

    this.limitsMetrics.setup(options.limitsMetrics);
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
    const run = await this.limitsBenchmarker.runBenchmark(request);
    return this.postProcessResults(run);
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
   * Sync current stored results to configured data sources.
   */
  async save(): Promise<void> {
    const run = RunContext.current;
    const results = this.limitsStore.getItemsFromCursor();
    const mappers = run.getCommonMappers();

    if (results.length === 0 || mappers.length === 0) return;

    const orgContext = await run.org.getContext();

    for (const mapper of mappers) {
      await mapper.saveLimitsResults(run, orgContext, results);
    }

    this.limitsStore.moveCursor();
  }

  private async ensureSetup(): Promise<RunContext> {
    if (!this.setupCalled) await this.setup();
    return RunContext.current;
  }

  private async postProcessResults(
    input: AnonApexBenchmarkRun<GovernorLimits, LimitsContext>
  ): Promise<LimitsBenchmarkRun> {
    try {
      const benchmarks = await this.limitsMetrics.calculate(input.benchmarks);

      this.limitsStore.addItems(benchmarks);

      return { benchmarks, errors: input.errors };
    } catch (e) {
      input.errors.push(Benchmark.coerceError(e));
      return input;
    }
  }
}
