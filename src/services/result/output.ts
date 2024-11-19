/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { TestResult } from '../../database/entity/result';
import { DEFAULT_NUMERIC_VALUE } from '../../shared/constants';
import { Timer } from '../../shared/timer';
import { TableReporter } from './table';
import { Threshold } from '../../testTemplates/transactionTestTemplate';
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

  // alert thresolds
  alertThresolds?: Threshold;
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

// adding a simple strategy for now, we need to think some other strategy for final work.
export function addAlertRecords(output: TestResultOutput): Alert {
  const alert: Alert = new Alert();
  alert.action = output.action;
  alert.flowName = output.flowName;
  if (output.alertThresolds) {
    alert.cpuTimeDegraded = output.cpuTime
      ? output.cpuTime > output.alertThresolds.cpuTimeThreshold
        ? output.cpuTime - output.alertThresolds.cpuTimeThreshold
        : 0
      : 0;
    alert.dmlRowsDegraded = output.dmlRows
      ? output.dmlRows > output.alertThresolds.dmlRowThreshold
        ? output.dmlRows - output.alertThresolds.dmlRowThreshold
        : 0
      : 0;
    alert.durationDegraded = output.timer.getTime()
      ? output.timer.getTime() > output.alertThresolds.durationThreshold
        ? output.timer.getTime() - output.alertThresolds.durationThreshold
        : 0
      : 0;
    alert.dmlStatementsDegraded = output.dmlStatements
      ? output.dmlStatements > output.alertThresolds.dmlStatementThreshold
        ? output.dmlStatements - output.alertThresolds.dmlStatementThreshold
        : 0
      : 0;
    alert.heapSizeDegraded = output.heapSize
      ? output.heapSize > output.alertThresolds.heapSizeThreshold
        ? output.heapSize - output.alertThresolds.heapSizeThreshold
        : 0
      : 0;
    alert.queryRowsDegraded = output.queryRows
      ? output.queryRows > output.alertThresolds.queryRowsThreshold
        ? output.queryRows - output.alertThresolds.queryRowsThreshold
        : 0
      : 0;
    alert.soqlQueriesDegraded = output.soqlQueries
      ? output.soqlQueries > output.alertThresolds.soqlQueriesThreshold
        ? output.soqlQueries - output.alertThresolds.soqlQueriesThreshold
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
