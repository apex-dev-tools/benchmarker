/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexBenchmarkResult } from '../benchmark/apex';
import { GovernorLimits } from '../benchmark/apex/schemas';
import { PostgresCommonDataMapper } from '../database/interop';
import { RunContext } from '../state/context';
import { calculateDeg } from './limits/deg';
import { getRangeCollection, RangeCollection } from './limits/ranges';

export interface LimitsMetricProviderOptions {
  enable?: boolean;
  limitRangesPath?: string;
}

export type LimitsMetric<T = number> = Record<keyof GovernorLimits, T>;

export type LimitsThresholds = Partial<LimitsMetric>;

export type LimitsAvg = Partial<LimitsMetric> & {
  name: string;
  action: string;
};

export class LimitsMetricProvider {
  protected globalEnabled: boolean = false;
  protected dataMapper?: PostgresCommonDataMapper;
  protected rangesPath?: string;
  protected ranges?: RangeCollection;

  setup(
    dataMapper: PostgresCommonDataMapper | undefined,
    options: LimitsMetricProviderOptions = {}
  ) {
    this.globalEnabled = options.enable ?? Boolean(process.env.BENCH_METRICS);
    this.dataMapper = dataMapper;
    this.rangesPath = options.limitRangesPath;
  }

  async calculate(
    results: ApexBenchmarkResult[]
  ): Promise<ApexBenchmarkResult[]> {
    const metricsToDo = this.identifyEnabled(results);
    if (metricsToDo.size == 0) {
      return results;
    }

    const ranges = await this.getRanges();
    const avgMap = await this.getRecentAverages(metricsToDo);

    const resultsAndMetrics = [...results];
    metricsToDo.forEach((bench, idx) => {
      resultsAndMetrics[idx] = {
        ...bench,
        deg: calculateDeg(
          bench.data,
          ranges,
          bench.action.context?.thresholds,
          avgMap.get(idx)
        ),
      };
    });

    return resultsAndMetrics;
  }

  private identifyEnabled(
    results: ApexBenchmarkResult[]
  ): Map<number, ApexBenchmarkResult> {
    return results.reduce((acc, curr, idx) => {
      const localEnabled = curr.action.context?.enableMetrics;
      if (localEnabled || (localEnabled == null && this.globalEnabled)) {
        acc.set(idx, curr);
      }
      return acc;
    }, new Map<number, ApexBenchmarkResult>());
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
    results: Map<number, ApexBenchmarkResult>
  ): Promise<Map<number, LimitsAvg>> {
    if (!this.dataMapper) {
      return new Map();
    }

    const names = new Set<string>();
    const actions = new Set<string>();
    const nameIndexes: Record<string, number> = {};
    results.forEach(({ name, action }, key) => {
      names.add(name);
      actions.add(action.name);
      nameIndexes[name + action.name] = key;
    });

    const records = await this.dataMapper.findLimitsTenDayAverage(
      RunContext.current.projectId,
      Array.from(names.values()),
      Array.from(actions.values())
    );

    const avg = new Map<number, LimitsAvg>();
    records.forEach(rec => {
      avg.set(nameIndexes[rec.name + rec.action], rec);
    });

    return avg;
  }
}
