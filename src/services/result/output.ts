/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { TestResult } from '../../database/entity/result';
import { DEFAULT_NUMERIC_VALUE } from '../../shared/constants';
import { Timer } from '../../shared/timer';
import { AlertInfo } from '../../testTemplates/transactionTestTemplate';
import { TableReporter } from './table';
import { Alert } from '../../database/entity/alert';

export interface TestResultOutput {
  timer: Timer;
  action: string;
  flowName: string;
  product: string;
  testType: string;
  error?: string;

  // browser/metrics
  incognitoBrowser?: boolean;
  lighthouseSpeedIndex?: number;
  lighthouseTimeToInteractive?: number;

  // limits
  lines?: number;
  documents?: number;
  cpuTime?: number;
  dmlRows?: number;
  dmlStatements?: number;
  heapSize?: number;
  queryRows?: number;
  soqlQueries?: number;
  queueableJobs?: number;
  futureCalls?: number;

  // alert info
  alertInfo?: AlertInfo;
}

export interface BenchmarkReporter {
  name: string;
  report(results: TestResult[]): Promise<void>;
}

export function convertOutputToTestResult(
  output: TestResultOutput
): TestResult {
  const testResult: TestResult = new TestResult();
  testResult.duration = output.timer.getTime();
  testResult.targetValue = output.timer.targetValue;
  testResult.action = output.action;
  testResult.flowName = output.flowName;
  testResult.error = output.error ? output.error : '';
  testResult.product = output.product;
  testResult.incognitoBrowser = !!output.incognitoBrowser;
  testResult.lighthouseSpeedIndex =
    output.lighthouseSpeedIndex || DEFAULT_NUMERIC_VALUE;
  testResult.lighthouseTimeToInteractive =
    output.lighthouseTimeToInteractive || DEFAULT_NUMERIC_VALUE;
  testResult.dlpLines = output.lines || DEFAULT_NUMERIC_VALUE;
  testResult.dpDocuments = output.documents || DEFAULT_NUMERIC_VALUE;
  testResult.testType = output.testType;
  testResult.cpuTime =
    output.cpuTime !== undefined ? output.cpuTime : DEFAULT_NUMERIC_VALUE;
  testResult.dmlRows =
    output.dmlRows !== undefined ? output.dmlRows : DEFAULT_NUMERIC_VALUE;
  testResult.dmlStatements =
    output.dmlStatements !== undefined
      ? output.dmlStatements
      : DEFAULT_NUMERIC_VALUE;
  testResult.heapSize =
    output.heapSize !== undefined ? output.heapSize : DEFAULT_NUMERIC_VALUE;
  testResult.queryRows =
    output.queryRows !== undefined ? output.queryRows : DEFAULT_NUMERIC_VALUE;
  testResult.soqlQueries =
    output.soqlQueries !== undefined
      ? output.soqlQueries
      : DEFAULT_NUMERIC_VALUE;
  testResult.queueableJobs =
    output.queueableJobs !== undefined
      ? output.queueableJobs
      : DEFAULT_NUMERIC_VALUE;
  testResult.futureCalls =
    output.futureCalls !== undefined
      ? output.futureCalls
      : DEFAULT_NUMERIC_VALUE;

  return testResult;
}

function getThresoldsByRange(
  dmlavg: number,
  soqlavg: number,
  cpuavg: number,
  dmlrowavg: number,
  heapavg: number,
  queryrowavg: number,
  rangeCollection: {
    dml_ranges: any[];
    soql_ranges: any[];
    cpu_ranges: any[];
    dmlRows_ranges: any[];
    heap_ranges: any[];
    queryRows_ranges: any[];
  }
) {
  //get limit ranges based on the average values
  const dmlRanges = rangeCollection.dml_ranges.filter(
    (e: { start_range: number; end_range: number }) =>
      dmlavg >= e.start_range && dmlavg <= e.end_range
  );

  const soqlRanges = rangeCollection.soql_ranges.filter(
    (e: { start_range: number; end_range: number }) =>
      soqlavg >= e.start_range && soqlavg <= e.end_range
  );

  const cpuRanges = rangeCollection.cpu_ranges.filter(
    (e: { start_range: number; end_range: number }) =>
      cpuavg >= e.start_range && cpuavg <= e.end_range
  );

  const dmlRowRanges = rangeCollection.dmlRows_ranges.filter(
    (e: { start_range: number; end_range: number }) =>
      dmlrowavg >= e.start_range && dmlrowavg <= e.end_range
  );

  const heapRanges = rangeCollection.heap_ranges.filter(
    (e: { start_range: number; end_range: number }) =>
      heapavg >= e.start_range && heapavg <= e.end_range
  );

  const queryRowRanges = rangeCollection.queryRows_ranges.filter(
    (e: { start_range: number; end_range: number }) =>
      queryrowavg >= e.start_range && queryrowavg <= e.end_range
  );

  //get threasholds based on the ranges
  const dmlThresold = dmlRanges[0]?.threshold || 0;
  const soqlThreshold = soqlRanges[0]?.threshold || 0;
  const cpuThreshold = cpuRanges[0]?.threshold || 0;
  const dmlRowThreshold = dmlRowRanges[0]?.threshold || 0;
  const heapThreshold = heapRanges[0]?.threshold || 0;
  const queryRowThreshold = queryRowRanges[0]?.threshold || 0;

  return {
    dmlThresold,
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
    };
  },
  rangeCollection: any
): Promise<Alert> {
  const alert: Alert = new Alert();
  alert.action = output.action;
  alert.flowName = output.flowName;

  //storing alerts if there is a degradation
  if (output.alertInfo?.thresolds) {
    alert.cpuTimeDegraded = output.cpuTime
      ? output.cpuTime > output.alertInfo.thresolds.cpuTimeThreshold
        ? output.cpuTime - output.alertInfo.thresolds.cpuTimeThreshold
        : 0
      : 0;
    alert.dmlRowsDegraded = output.dmlRows
      ? output.dmlRows > output.alertInfo.thresolds.dmlRowThreshold
        ? output.dmlRows - output.alertInfo.thresolds.dmlRowThreshold
        : 0
      : 0;
    alert.dmlStatementsDegraded = output.dmlStatements
      ? output.dmlStatements > output.alertInfo.thresolds.dmlStatementThreshold
        ? output.dmlStatements -
          output.alertInfo.thresolds.dmlStatementThreshold
        : 0
      : 0;
    alert.heapSizeDegraded = output.heapSize
      ? output.heapSize > output.alertInfo.thresolds.heapSizeThreshold
        ? output.heapSize - output.alertInfo.thresolds.heapSizeThreshold
        : 0
      : 0;
    alert.queryRowsDegraded = output.queryRows
      ? output.queryRows > output.alertInfo.thresolds.queryRowsThreshold
        ? output.queryRows - output.alertInfo.thresolds.queryRowsThreshold
        : 0
      : 0;
    alert.soqlQueriesDegraded = output.soqlQueries
      ? output.soqlQueries > output.alertInfo.thresolds.soqlQueriesThreshold
        ? output.soqlQueries - output.alertInfo.thresolds.soqlQueriesThreshold
        : 0
      : 0;
  } else {
    // Construct the key for the current flowName and actionName
    const key = `${output.flowName}_${output.action}`;

    // Retrieve pre-fetched average values for this flow-action pair
    const averageResults = preFetchedAverages[key] || {
      dmlavg: 0,
      soqlavg: 0,
      cpuavg: 0,
      dmlrowavg: 0,
      heapavg: 0,
      queryrowavg: 0,
    };
    const thresolds = getThresoldsByRange(
      averageResults.dmlavg,
      averageResults.soqlavg,
      averageResults.cpuavg,
      averageResults.dmlrowavg,
      averageResults.heapavg,
      averageResults.queryrowavg,
      rangeCollection
    );
    alert.dmlStatementsDegraded = output.dmlStatements
      ? output.dmlStatements >
        Number(thresolds.dmlThresold) + Number(averageResults.dmlavg)
        ? output.dmlStatements -
          (Number(thresolds.dmlThresold) + Number(averageResults.dmlavg))
        : 0
      : 0;

    alert.soqlQueriesDegraded = output.soqlQueries
      ? output.soqlQueries >
        Number(thresolds.soqlThreshold) + Number(averageResults.soqlavg)
        ? output.soqlQueries -
          (Number(thresolds.soqlThreshold) + Number(averageResults.soqlavg))
        : 0
      : 0;

    alert.cpuTimeDegraded = output.cpuTime
      ? output.cpuTime >
        Number(thresolds.cpuThreshold) + Number(averageResults.cpuavg)
        ? output.cpuTime -
          (Number(thresolds.cpuThreshold) + Number(averageResults.cpuavg))
        : 0
      : 0;

    alert.dmlRowsDegraded = output.dmlRows
      ? output.dmlRows >
        Number(thresolds.dmlRowThreshold) + Number(averageResults.dmlrowavg)
        ? output.dmlRows -
          (Number(thresolds.dmlRowThreshold) + Number(averageResults.dmlrowavg))
        : 0
      : 0;

    alert.heapSizeDegraded = output.heapSize
      ? output.heapSize >
        Number(thresolds.heapThreshold) + Number(averageResults.heapavg)
        ? output.heapSize -
          (Number(thresolds.heapThreshold) + Number(averageResults.heapavg))
        : 0
      : 0;

    alert.soqlRowDegraded = output.queryRows
      ? output.queryRows >
        Number(thresolds.queryRowThreshold) + Number(averageResults.queryrowavg)
        ? output.queryRows -
          (Number(thresolds.queryRowThreshold) +
            Number(averageResults.queryrowavg))
        : 0
      : 0;
  }
  return alert;
}

let reporters: BenchmarkReporter[] = [new TableReporter()];

export function addReporter(reporter: BenchmarkReporter) {
  reporters.push(reporter);
}

export function clearReporters() {
  reporters = [];
}

export function getReporters(): BenchmarkReporter[] {
  return reporters;
}
