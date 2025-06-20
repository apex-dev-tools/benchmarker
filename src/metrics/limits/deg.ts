/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { GovernorLimits } from '../../benchmark/limits/schemas';
import { LimitsAvg, LimitsMetric, LimitsThresholds } from '../limits';
import { createLimitMetric } from './factory';
import { RangeCollection, ThresholdOffsetRange } from './ranges';

export interface Degradation {
  overAvg: number;
  overThreshold: number;
  isOffset: boolean;
}

export type DegLimitsMetric = LimitsMetric<Degradation>;

export function calculateDeg(
  limits: GovernorLimits,
  ranges: RangeCollection,
  thresholds?: LimitsThresholds,
  avgs?: LimitsAvg
): LimitsMetric<Degradation> | undefined {
  // if all overThreshold are 0, one of:
  // - not a degradation
  // - no avg found to offset
  // - no offset found
  let isDegraded = false;

  const deg = createLimitMetric<Degradation>(key => {
    const limit = limits[key];
    const avg = avgs?.[key];
    const threshold = thresholds?.[key];
    const isOffset = threshold == null;

    const overThreshold = isOffset
      ? calcOverValueOffset(limit, avg, ranges[key])
      : calcOverValue(limit, threshold);

    if (overThreshold > 0) isDegraded = true;

    return {
      overAvg: calcOverValue(limit, avg),
      overThreshold,
      isOffset,
    };
  });

  return isDegraded ? deg : undefined;
}

function calcOverValue(value: number, threshValue?: number): number {
  return threshValue != null && value > threshValue ? value - threshValue : 0;
}

function calcOverValueOffset(
  value: number,
  initValue?: number,
  ranges?: ThresholdOffsetRange[]
): number {
  return initValue != null && ranges != null
    ? calcOverValue(value, applyOffsetInRange(initValue, ranges))
    : 0;
}

function applyOffsetInRange(
  value: number,
  ranges: ThresholdOffsetRange[]
): number | undefined {
  const offset = ranges.find(
    ({ rangeStart, rangeEnd }) => value >= rangeStart && value <= rangeEnd
  )?.thresholdOffset;

  return offset ? value + offset : undefined;
}
