/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { JTDSchemaType } from "ajv/dist/core.js";
import fs from "node:fs/promises";
import path from "node:path";
import { type NamedSchema, parseType } from "../../parser/json.js";
import type { LimitsMetric } from "../limits.js";

export interface ThresholdOffsetRange {
  rangeStart: number;
  rangeEnd: number;
  thresholdOffset: number;
}

export type RangeCollection = Partial<
  Record<keyof LimitsMetric, ThresholdOffsetRange[]>
>;

const offsetSchemaType: JTDSchemaType<ThresholdOffsetRange> = {
  properties: {
    rangeStart: { type: "int32" },
    rangeEnd: { type: "int32" },
    thresholdOffset: { type: "int32" },
  },
};

const rangeSchema: NamedSchema<RangeCollection> = {
  name: "customRanges",
  schema: {
    optionalProperties: {
      duration: { elements: offsetSchemaType },
      cpuTime: { elements: offsetSchemaType },
      dmlRows: { elements: offsetSchemaType },
      dmlStatements: { elements: offsetSchemaType },
      heapSize: { elements: offsetSchemaType },
      queryRows: { elements: offsetSchemaType },
      soqlQueries: { elements: offsetSchemaType },
      queueableJobs: { elements: offsetSchemaType },
      futureCalls: { elements: offsetSchemaType },
    },
  },
};

const defaultRanges: RangeCollection = {
  cpuTime: [
    { rangeStart: 0, rangeEnd: 2000, thresholdOffset: 3000 },
    { rangeStart: 2001, rangeEnd: 4000, thresholdOffset: 2500 },
    { rangeStart: 4001, rangeEnd: 6000, thresholdOffset: 2000 },
    { rangeStart: 6001, rangeEnd: 8000, thresholdOffset: 1500 },
    { rangeStart: 8001, rangeEnd: 9000, thresholdOffset: 1000 },
    { rangeStart: 9000, rangeEnd: 9500, thresholdOffset: 500 },
    { rangeStart: 9501, rangeEnd: 9999, thresholdOffset: 100 },
  ],
  dmlRows: [
    { rangeStart: 0, rangeEnd: 2000, thresholdOffset: 2000 },
    { rangeStart: 2001, rangeEnd: 5000, thresholdOffset: 1000 },
    { rangeStart: 5001, rangeEnd: 8000, thresholdOffset: 500 },
    { rangeStart: 8001, rangeEnd: 9000, thresholdOffset: 200 },
    { rangeStart: 9001, rangeEnd: 9999, thresholdOffset: 1 },
  ],
  dmlStatements: [
    { rangeStart: 0, rangeEnd: 50, thresholdOffset: 5 },
    { rangeStart: 51, rangeEnd: 100, thresholdOffset: 3 },
    { rangeStart: 101, rangeEnd: 120, thresholdOffset: 2 },
    { rangeStart: 121, rangeEnd: 149, thresholdOffset: 1 },
  ],
  heapSize: [
    { rangeStart: 0, rangeEnd: 2000000, thresholdOffset: 2000000 },
    { rangeStart: 2000001, rangeEnd: 3000000, thresholdOffset: 1000000 },
    { rangeStart: 3000001, rangeEnd: 5000000, thresholdOffset: 500000 },
    { rangeStart: 5000001, rangeEnd: 6000000, thresholdOffset: 100000 },
  ],
  queryRows: [
    { rangeStart: 0, rangeEnd: 20000, thresholdOffset: 5000 },
    { rangeStart: 20001, rangeEnd: 30000, thresholdOffset: 4000 },
    { rangeStart: 30001, rangeEnd: 40000, thresholdOffset: 2000 },
    { rangeStart: 40001, rangeEnd: 48000, thresholdOffset: 1000 },
    { rangeStart: 48001, rangeEnd: 49999, thresholdOffset: 1 },
  ],
  soqlQueries: [
    { rangeStart: 0, rangeEnd: 50, thresholdOffset: 10 },
    { rangeStart: 51, rangeEnd: 80, thresholdOffset: 5 },
    { rangeStart: 81, rangeEnd: 90, thresholdOffset: 2 },
    { rangeStart: 91, rangeEnd: 99, thresholdOffset: 1 },
  ],
};

/**
 * Load the range collection from either a custom json file or default.
 */
export async function getRangeCollection(
  filePath?: string
): Promise<RangeCollection> {
  if (filePath) {
    const rangeData = await fs.readFile(path.resolve(filePath), {
      encoding: "utf8",
    });
    return { ...defaultRanges, ...parseType(rangeData, rangeSchema) };
  }

  return defaultRanges;
}
