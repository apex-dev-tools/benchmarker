/** @ignore */
/**
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { RangeCollection } from './ranges';

export const DEFAULT_RANGES: RangeCollection = {
  dml_ranges: [
    { start_range: 0, end_range: 50, offsetThreshold: 5 },
    { start_range: 51, end_range: 100, offsetThreshold: 3 },
    { start_range: 101, end_range: 120, offsetThreshold: 2 },
    { start_range: 121, end_range: 149, offsetThreshold: 1 },
  ],
  soql_ranges: [
    { start_range: 0, end_range: 50, offsetThreshold: 10 },
    { start_range: 51, end_range: 80, offsetThreshold: 5 },
    { start_range: 81, end_range: 90, offsetThreshold: 2 },
    { start_range: 91, end_range: 99, offsetThreshold: 1 },
  ],
  cpu_ranges: [
    { start_range: 0, end_range: 2000, offsetThreshold: 3000 },
    { start_range: 2001, end_range: 4000, offsetThreshold: 2500 },
    { start_range: 4001, end_range: 6000, offsetThreshold: 2000 },
    { start_range: 6001, end_range: 8000, offsetThreshold: 1500 },
    { start_range: 8001, end_range: 9000, offsetThreshold: 1000 },
    { start_range: 9000, end_range: 9500, offsetThreshold: 500 },
    { start_range: 9501, end_range: 9999, offsetThreshold: 100 },
  ],
  heap_ranges: [
    { start_range: 0, end_range: 2000000, offsetThreshold: 2000000 },
    { start_range: 2000001, end_range: 3000000, offsetThreshold: 1000000 },
    { start_range: 3000001, end_range: 5000000, offsetThreshold: 500000 },
    { start_range: 5000001, end_range: 6000000, offsetThreshold: 100000 },
  ],
  dmlRows_ranges: [
    { start_range: 0, end_range: 2000, offsetThreshold: 2000 },
    { start_range: 2001, end_range: 5000, offsetThreshold: 1000 },
    { start_range: 5001, end_range: 8000, offsetThreshold: 500 },
    { start_range: 8001, end_range: 9000, offsetThreshold: 200 },
    { start_range: 9001, end_range: 9999, offsetThreshold: 1 },
  ],
  queryRows_ranges: [
    { start_range: 0, end_range: 20000, offsetThreshold: 5000 },
    { start_range: 20001, end_range: 30000, offsetThreshold: 4000 },
    { start_range: 30001, end_range: 40000, offsetThreshold: 2000 },
    { start_range: 40001, end_range: 48000, offsetThreshold: 1000 },
    { start_range: 48001, end_range: 49999, offsetThreshold: 1 },
  ],
};
