/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexBenchmarkResult } from '../benchmark/apex';
import { LimitsAvg } from '../metrics/limits';
import { OrgContext } from '../salesforce/org/context';
import { RunContext } from '../state/context';

/**
 * Interface for common operations between different postgres mappers.
 */
export interface PostgresCommonDataMapper {
  saveApexResults(
    run: RunContext,
    org: OrgContext,
    results: ApexBenchmarkResult[]
  ): Promise<void>;

  findLimitsTenDayAverage(
    projectId: string,
    names: string[],
    actionNames: string[]
  ): Promise<LimitsAvg[]>;
}
