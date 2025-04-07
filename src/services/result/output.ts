/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { TestResult } from '../../database/entity/result';
import { AlertInfo } from '../../testTemplates/transactionTestTemplate';
import { Alert } from '../../database/entity/alert';
import { RangeCollection, OffsetThresholdRange } from '../ranges';

export interface TestResultOutput {
  result: TestResult;
  alertInfo?: AlertInfo;
}

export interface BenchmarkReporter {
  name: string;
  report(results: TestResult[]): Promise<void>;
}

export function getOffsetThresholdsByRange(
  averageResults: {
    dmlavg: number;
    soqlavg: number;
    cpuavg: number;
    dmlrowavg: number;
    heapavg: number;
    queryrowavg: number;
  },
  rangeCollection: RangeCollection
) {
  //get limit ranges based on the average values
  const dmlRanges = rangeCollection.dml_ranges.filter(
    (e: OffsetThresholdRange) =>
      averageResults.dmlavg >= e.start_range &&
      averageResults.dmlavg <= e.end_range
  );

  const soqlRanges = rangeCollection.soql_ranges.filter(
    (e: OffsetThresholdRange) =>
      averageResults.soqlavg >= e.start_range &&
      averageResults.soqlavg <= e.end_range
  );

  const cpuRanges = rangeCollection.cpu_ranges.filter(
    (e: OffsetThresholdRange) =>
      averageResults.cpuavg >= e.start_range &&
      averageResults.cpuavg <= e.end_range
  );

  const dmlRowRanges = rangeCollection.dmlRows_ranges.filter(
    (e: OffsetThresholdRange) =>
      averageResults.dmlrowavg >= e.start_range &&
      averageResults.dmlrowavg <= e.end_range
  );

  const heapRanges = rangeCollection.heap_ranges.filter(
    (e: OffsetThresholdRange) =>
      averageResults.heapavg >= e.start_range &&
      averageResults.heapavg <= e.end_range
  );

  const queryRowRanges = rangeCollection.queryRows_ranges.filter(
    (e: OffsetThresholdRange) =>
      averageResults.queryrowavg >= e.start_range &&
      averageResults.queryrowavg <= e.end_range
  );

  //get threasholds based on the ranges
  const dmlThreshold = dmlRanges[0]?.offset_threshold || 0;
  const soqlThreshold = soqlRanges[0]?.offset_threshold || 0;
  const cpuThreshold = cpuRanges[0]?.offset_threshold || 0;
  const dmlRowThreshold = dmlRowRanges[0]?.offset_threshold || 0;
  const heapThreshold = heapRanges[0]?.offset_threshold || 0;
  const queryRowThreshold = queryRowRanges[0]?.offset_threshold || 0;

  return {
    dmlThreshold,
    soqlThreshold,
    cpuThreshold,
    dmlRowThreshold,
    heapThreshold,
    queryRowThreshold,
  };
}

export async function addAlertByComparingAvg(
  output: TestResultOutput,
  preFetchedAverages: {
    [key: string]: {
      dmlavg: number;
      soqlavg: number;
      cpuavg: number;
      dmlrowavg: number;
      heapavg: number;
      queryrowavg: number;
      runcount: number;
    };
  },
  rangeCollection: RangeCollection
): Promise<Alert> {
  const { result, alertInfo } = output;
  const alert: Alert = new Alert();
  alert.action = result.action;
  alert.flowName = result.flowName;

  // Construct the key for the current flowName and actionName
  const key = `${result.flowName}_${result.action}`;

  // Retrieve pre-fetched average values for this flow-action pair
  const averageResults = preFetchedAverages[key];

  if (!averageResults || averageResults.runcount < 5) {
    return alert;
  }

  //storing alerts if there is a degradation
  if (alertInfo?.thresholds) {
    alert.cpuTimeDegraded =
      result.cpuTime > alertInfo.thresholds.cpuTimeThreshold
        ? result.cpuTime - Number(averageResults.cpuavg)
        : 0;

    alert.dmlRowsDegraded =
      result.dmlRows > alertInfo.thresholds.dmlRowThreshold
        ? result.dmlRows - Number(averageResults.dmlrowavg)
        : 0;

    alert.dmlStatementsDegraded =
      result.dmlStatements > alertInfo.thresholds.dmlStatementThreshold
        ? result.dmlStatements - Number(averageResults.dmlavg)
        : 0;

    alert.heapSizeDegraded =
      result.heapSize > alertInfo.thresholds.heapSizeThreshold
        ? result.heapSize - Number(averageResults.heapavg)
        : 0;

    alert.queryRowsDegraded =
      result.queryRows > alertInfo.thresholds.queryRowsThreshold
        ? result.queryRows - Number(averageResults.queryrowavg)
        : 0;

    alert.soqlQueriesDegraded =
      result.soqlQueries > alertInfo.thresholds.soqlQueriesThreshold
        ? result.soqlQueries - Number(averageResults.soqlavg)
        : 0;
  } else {
    const thresholds = getOffsetThresholdsByRange(
      averageResults,
      rangeCollection
    );

    alert.dmlStatementsDegraded =
      result.dmlStatements >
      Number(thresholds.dmlThreshold) + Number(averageResults.dmlavg)
        ? result.dmlStatements - Number(averageResults.dmlavg)
        : 0;

    alert.soqlQueriesDegraded =
      result.soqlQueries >
      Number(thresholds.soqlThreshold) + Number(averageResults.soqlavg)
        ? result.soqlQueries - Number(averageResults.soqlavg)
        : 0;

    alert.cpuTimeDegraded =
      result.cpuTime >
      Number(thresholds.cpuThreshold) + Number(averageResults.cpuavg)
        ? result.cpuTime - Number(averageResults.cpuavg)
        : 0;

    alert.dmlRowsDegraded =
      result.dmlRows >
      Number(thresholds.dmlRowThreshold) + Number(averageResults.dmlrowavg)
        ? result.dmlRows - Number(averageResults.dmlrowavg)
        : 0;

    alert.heapSizeDegraded =
      result.heapSize >
      Number(thresholds.heapThreshold) + Number(averageResults.heapavg)
        ? result.heapSize - Number(averageResults.heapavg)
        : 0;

    alert.queryRowsDegraded =
      result.queryRows >
      Number(thresholds.queryRowThreshold) + Number(averageResults.queryrowavg)
        ? result.queryRows - Number(averageResults.queryrowavg)
        : 0;
  }

  return alert;
}
