/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { BenchmarkId } from "../benchmark/base.js";
import type { GovernorLimits } from "../benchmark/limits/schemas.js";
import type { PostgresCommonDataMapper } from "../database/interop.js";
import type { LimitsBenchmarkResult } from "../service/apex.js";
import { RunContext } from "../state/context.js";
import { calculateDeg } from "./limits/deg.js";
import { getRangeCollection, type RangeCollection } from "./limits/ranges.js";

export interface LimitsMetricProviderOptions {
  enable?: boolean;
  limitRangesPath?: string;
}

export type LimitsMetric<T = number> = Record<keyof GovernorLimits, T>;

export type LimitsThresholds = Partial<LimitsMetric>;

export type LimitsAvg = Partial<LimitsMetric> & BenchmarkId;

export class LimitsMetricProvider {
  protected globalEnabled: boolean = false;
  protected rangesPath?: string;
  protected ranges?: RangeCollection;

  setup(options: LimitsMetricProviderOptions = {}) {
    this.globalEnabled = options.enable ?? Boolean(process.env.BENCH_METRICS);
    this.rangesPath = options.limitRangesPath;
  }

  async calculate(
    results: LimitsBenchmarkResult[]
  ): Promise<LimitsBenchmarkResult[]> {
    const enabled = this.identifyEnabled(results);
    if (enabled.length == 0) {
      return results;
    }

    const ranges = await this.getRanges();
    const avgDict = await this.getRecentAverages(results, enabled);

    const resultsAndMetrics = [...results];
    enabled.forEach(idx => {
      const current = resultsAndMetrics[idx];
      resultsAndMetrics[idx] = {
        ...current,
        deg: calculateDeg(
          current.data,
          ranges,
          current.context?.thresholds,
          avgDict[current.name + current.action]
        ),
      };
    });

    return resultsAndMetrics;
  }

  private identifyEnabled(results: LimitsBenchmarkResult[]): number[] {
    return results.reduce<number[]>((acc, curr, idx) => {
      const localEnabled = curr.context?.enableMetrics;
      if (localEnabled || (localEnabled == null && this.globalEnabled)) {
        acc.push(idx);
      }
      return acc;
    }, []);
  }

  private async getRanges(): Promise<RangeCollection> {
    if (!this.ranges) {
      this.ranges = await getRangeCollection(
        this.rangesPath || process.env.BENCH_METRICS_LIMIT_RANGES
      );
    }
    return this.ranges;
  }

  private async getRecentAverages(
    results: LimitsBenchmarkResult[],
    indexes: number[]
  ): Promise<Partial<Record<string, LimitsAvg>>> {
    const toAvg =
      indexes.length === results.length
        ? results
        : indexes.map(i => results[i]);

    const records = await this.tryFindAvgQuery(RunContext.current, toAvg);

    return records.reduce<Partial<Record<string, LimitsAvg>>>((dict, rec) => {
      dict[rec.name + rec.action] = rec;
      return dict;
    }, {});
  }

  private async tryFindAvgQuery(
    run: RunContext,
    toAvg: LimitsBenchmarkResult[]
  ): Promise<LimitsAvg[]> {
    // new db may be empty/below 5 runs - use legacy as fallback if in use
    const mappers = run.getCommonMappers();
    for (const mapper of mappers) {
      const records = await mapper.findLimitsTenDayAverage(run, toAvg);
      if (records.length > 0) return records;
    }
    return [];
  }
}
