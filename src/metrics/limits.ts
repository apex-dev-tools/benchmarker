/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexBenchmarkResult } from '../benchmark/apex';
import { GovernorLimits } from '../benchmark/apex/schemas';
import { BenchmarkResultId } from '../benchmark/base';
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

export type LimitsAvg = Partial<LimitsMetric> & BenchmarkResultId;

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
          current.action.context?.thresholds,
          avgDict[current.name + current.action.name]
        ),
      };
    });

    return resultsAndMetrics;
  }

  private identifyEnabled(results: ApexBenchmarkResult[]): number[] {
    return results.reduce<number[]>((acc, curr, idx) => {
      const localEnabled = curr.action.context?.enableMetrics;
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
    results: ApexBenchmarkResult[],
    indexes: number[]
  ): Promise<Partial<Record<string, LimitsAvg>>> {
    if (!this.dataMapper) {
      return {};
    }
    const toAvg =
      indexes.length === results.length
        ? results
        : indexes.map(i => results[i]);

    const records = await this.dataMapper.findLimitsTenDayAverage(
      RunContext.current.projectId,
      toAvg
    );

    return records.reduce<Partial<Record<string, LimitsAvg>>>((dict, rec) => {
      dict[rec.name + rec.actionName] = rec;
      return dict;
    }, {});
  }
}
