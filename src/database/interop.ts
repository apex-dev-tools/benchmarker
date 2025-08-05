/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { BenchmarkResult } from "../benchmark/base.js";
import type { LimitsAvg } from "../metrics/limits.js";
import type { OrgContext } from "../salesforce/org/context.js";
import type { LimitsBenchmarkResult } from "../service/apex.js";
import type { RunContext } from "../state/context.js";

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
