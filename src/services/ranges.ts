/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export interface ThresholdRange {
  start_range: number;
  end_range: number;
  threshold: number;
}

export interface RangeCollection {
  dml_ranges: ThresholdRange[];
  soql_ranges: ThresholdRange[];
  cpu_ranges: ThresholdRange[];
  dmlRows_ranges: ThresholdRange[];
  heap_ranges: ThresholdRange[];
  queryRows_ranges: ThresholdRange[];
}
