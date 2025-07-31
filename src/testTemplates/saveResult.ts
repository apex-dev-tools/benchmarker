/*
 * Copyright (c) 2019 Certinia Inc. All rights reserved.
 */

import {
  TransactionTestTemplate,
  TestFlowOutput,
  GovernorMetricsResult,
} from './transactionTestTemplate';
import { Timer } from '../shared/timer';
import { TestResultOutput } from '../services/result/output';
import { getOrgContext } from '../services/org';
import { reportResults } from '../services/result';

/**
 * Retrieve peformance metrics from a tests execution and save them
 * @param processTestTemplate object with the information required to execute a test
 * @param results results of the test steps executions
 */
export const saveResults = async (
  processTestTemplate: TransactionTestTemplate,
  results: TestFlowOutput[]
) => {
  const testResults = results.map((flowOutput: TestFlowOutput) => {
    const action: string = flowOutput.testStepDescription.action;
    const flowName: string = flowOutput.testStepDescription.flowName;
    const result: GovernorMetricsResult = flowOutput.result;
    const testTimer = new Timer('');
    testTimer.setTime(result.timer);
    const testStep: TestResultOutput = {
      timer: testTimer,
      cpuTime: result.cpuTime,
      dmlRows: result.dmlRows,
      dmlStatements: result.dmlStatements,
      heapSize: result.heapSize,
      queryRows: result.queryRows,
      soqlQueries: result.soqlQueries,
      queueableJobs: result.queueableJobs,
      futureCalls: result.futureCalls,
      loadTime: result.loadTime,
      action,
      flowName,
      additionalData: flowOutput.testStepDescription.additionalData
        ? flowOutput.testStepDescription.additionalData
        : '',
      error: flowOutput.error ? flowOutput.error : '',
      product: processTestTemplate.product,
      incognitoBrowser: false,
      lighthouseSpeedIndex: undefined,
      lighthouseTimeToInteractive: undefined,
      testType: processTestTemplate.testType,
      alertInfo: flowOutput.alertInfo,
    };

    return testStep;
  });

  const orgContext = await getOrgContext(processTestTemplate.connection);

  await reportResults(testResults, orgContext);
};
