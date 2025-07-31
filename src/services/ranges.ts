/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export interface OffsetThresholdRange {
  start_range: number;
  end_range: number;
  offset_threshold: number;
  enforce?: boolean;
}

export interface RangeCollection {
  dml_ranges: OffsetThresholdRange[];
  soql_ranges: OffsetThresholdRange[];
  cpu_ranges: OffsetThresholdRange[];
  dmlRows_ranges: OffsetThresholdRange[];
  heap_ranges: OffsetThresholdRange[];
  queryRows_ranges: OffsetThresholdRange[];
  loadTime_ranges?: OffsetThresholdRange[];
}
