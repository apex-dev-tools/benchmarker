/*
 * Copyright (c) 2019 Certinia Inc. All rights reserved.
 */

import {
  TransactionTestTemplate,
  TestFlowOutput,
  GovernorMetricsResult,
} from './transactionTestTemplate';
import { reportResults } from '../services/result';
import { TestResult } from '../database/entity/result';
import { TestResultOutput } from '../services/result/output';

/**
 * Retrieve peformance metrics from a tests execution and save them
 * @param processTestTemplate object with the information required to execute a test
 * @param results results of the test steps executions
 */
export const saveResults = async (
  processTestTemplate: TransactionTestTemplate,
  results: TestFlowOutput[]
) => {
  const tests: TestResultOutput[] = results.map(
    (flowOutput: TestFlowOutput) => {
      const r: TestResult = new TestResult();
      r.flowName = flowOutput.testStepDescription.flowName;
      r.action = flowOutput.testStepDescription.action;
      r.product = processTestTemplate.product;
      r.testType = processTestTemplate.testType;

      const limits: GovernorMetricsResult = flowOutput.result;
      r.duration = limits.timer;
      r.cpuTime = limits.cpuTime;
      r.dmlRows = limits.dmlRows;
      r.dmlStatements = limits.dmlStatements;
      r.heapSize = limits.heapSize;
      r.queryRows = limits.queryRows;
      r.soqlQueries = limits.soqlQueries;
      r.queueableJobs = limits.queueableJobs;
      r.futureCalls = limits.futureCalls;

      return { result: r, alertInfo: flowOutput.alertInfo };
    }
  );

  await reportResults(processTestTemplate.connection, tests);
};
