/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ErrorResult } from '../benchmark/base';
import { RunContext, RunContextOptions } from '../state/context';
import {
  LimitsMetricProvider,
  LimitsMetricProviderOptions,
} from '../metrics/limits';
import { RunStore } from '../state/store';
import { ApexScriptParserOptions } from '../parser/apex';
import {
  AnonApexBenchmarker,
  AnonApexBenchmarkerRequest,
  AnonApexBenchmarkRun,
} from './apex/runner';
import {
  LimitsAnonApexBenchmark,
  LimitsBenchmarkOptions,
} from '../benchmark/anon/limits';
import { GovernorLimits, LimitsContext } from '../benchmark/anon/schemas';
import { DegLimitsMetric } from '../metrics/limits/deg';
import { AnonApexBenchmarkResult } from '../benchmark/anon';

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
  protected store: RunStore<LimitsBenchmarkResult>;
  protected limitsBenchmarker: LimitsBenchmarker;
  protected limitsMetrics: LimitsMetricProvider;

  constructor() {
    this.store = new RunStore();
    this.limitsBenchmarker = new AnonApexBenchmarker(
      LimitsAnonApexBenchmark.create
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
   * Run benchmark for governor limits on requested apex code or paths.
   * Applies metrics to results if enabled.
   *
   * @param request Set either `code` or `paths` together with any options to
   * customise the benchmark. Some benchmark options may not be applicable when used
   * with multiple paths or directories.
   * @returns A merged list of results from all requested benchmarks.
   */
  async benchmarkLimits(
    request: AnonApexBenchmarkerRequest<LimitsBenchmarkOptions>
  ): Promise<LimitsBenchmarkRun> {
    const ctx = await this.ensureSetup();
    const run = await this.limitsBenchmarker.runBenchmark({
      ...request,
      parser: this.setParserNamespaceExclusions(
        ctx.org.getNamespaceRegExp(),
        request.parser
      ),
    });

    return this.postProcessResults(run);
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
      mapper.saveLimitsResults(run, orgContext, results)
    );

    this.store.moveCursor();
  }

  private async ensureSetup(): Promise<RunContext> {
    if (!this.setupCalled) await this.setup();
    return RunContext.current;
  }

  private setParserNamespaceExclusions(
    namespaces: RegExp[],
    options?: ApexScriptParserOptions
  ): ApexScriptParserOptions | undefined {
    if (namespaces.length === 0) {
      return options;
    }

    return {
      exclude: (options?.exclude || []).concat(namespaces),
      replace: options?.replace,
    };
  }

  private async postProcessResults(
    input: AnonApexBenchmarkRun<GovernorLimits, LimitsContext>
  ): Promise<LimitsBenchmarkRun> {
    try {
      const benchmarks = await this.limitsMetrics.calculate(input.benchmarks);

      this.store.addItems(benchmarks);

      return { benchmarks, errors: input.errors };
    } catch (e) {
      input.errors.push({ error: e instanceof Error ? e : new Error(`${e}`) });
      return input;
    }
  }
}
