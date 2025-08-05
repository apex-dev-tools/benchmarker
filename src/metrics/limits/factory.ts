/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { LimitsMetric } from '../limits.js';

const base: Readonly<LimitsMetric> = {
  duration: 0,
  cpuTime: 0,
  dmlRows: 0,
  dmlStatements: 0,
  heapSize: 0,
  queryRows: 0,
  soqlQueries: 0,
  queueableJobs: 0,
  futureCalls: 0,
};

export function createLimitMetric<T>(
  fn: (key: keyof LimitsMetric) => T
): LimitsMetric<T> {
  // entries normally typed [string, number][]
  const entries = Object.entries(base) as {
    [K in keyof LimitsMetric]: [K, LimitsMetric<T>[K]];
  }[keyof LimitsMetric][];

  // fromEntries normally typed { [k: string]: number }
  return Object.fromEntries(entries.map(([key]) => [key, fn(key)])) as {
    [K in (typeof entries)[number] as K[0]]: K[1];
  };
}
