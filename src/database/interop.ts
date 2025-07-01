/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { LimitsBenchmarkResult } from '../service/apex';
import { BenchmarkResult } from '../benchmark/base';
import { LimitsAvg } from '../metrics/limits';
import { OrgContext } from '../salesforce/org/context';
import { RunContext } from '../state/context';

/**
 * Interface for common operations between different postgres mappers.
 */
export interface PostgresCommonDataMapper {
  saveLimitsResults(
    run: RunContext,
    org: OrgContext,
    results: LimitsBenchmarkResult[]
  ): Promise<void>;

  findLimitsTenDayAverage(
    projectId: string,
    results: LimitsBenchmarkResult[]
  ): Promise<LimitsAvg[]>;
}

/**
 * Helper functions shared by mappers.
 */
export class CommonDataUtil {
  private constructor() {}

  static idSetsFromResults(results: BenchmarkResult[]): {
    names: string[];
    actions: string[];
  } {
    const nameSet = new Set<string>();
    const actionSet = new Set<string>();

    results.forEach(({ name, action }) => {
      nameSet.add(name);
      actionSet.add(action);
    });

    return { names: Array.from(nameSet), actions: Array.from(actionSet) };
  }
}
