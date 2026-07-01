/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { TRANSACTION_PROCESS } from '../shared/constants';
import {
  connectToSalesforceOrg,
  getSalesforceAuthInfoFromEnvVars,
  SalesforceConnection,
} from '../services/salesforce/connection';
import { TokenReplacement } from '../services/tokenReplacement';

export interface GovernorMetricsResult {
  timer: number;
  cpuTime: number;
  dmlRows: number;
  dmlStatements: number;
  heapSize: number;
  queryRows: number;
  soqlQueries: number;
  queueableJobs: number;
  futureCalls: number;
}

export interface ProcessParams {
  connection: SalesforceConnection;
}

/**
 * Test Template to execute anonymous Apex code from a file and extract the Governor Limits
 */
export class TransactionTestTemplate {
  /**
   * Product name
   */
  public product: string;

  /**
   * Object to handle the connection to a Salesforce Org
   */
  public connection: SalesforceConnection;

  /**
   * Describes what kind of action the test is going to perfrom
   */
  public action: string;

  /**
   * Test steps to be executed
   */
  public flowSteps: FlowStep[];

  /**
   * Results of the test steps executions
   */
  public flowStepsResults: TestFlowOutput[];

  /**
   * Defines the use case the test is going to cover. For example Form Load, Document Line Process, Document Process
   */
  public testType: string;
}

/**
 * TransactionTestTemplate to add information about the name of the flow to be executed and the action perfromed
 */
export interface TestStepDescription {
  action: string;
  flowName: string;
  additionalData?: string;
}

/**
 * Describes the Thresholds for different limits
 * Thresholds that needs to be defined using this class: cpuTimeThreshold, dmlStatementThreshold, dmlRowThreshold, heapSizeThreshold, queryRowsThreshold, soqlQueriesThreshold
 */
export class Thresholds {
  cpuTimeThreshold: number;
  dmlStatementThreshold: number;
  dmlRowThreshold: number;
  heapSizeThreshold: number;
  queryRowsThreshold: number;
  soqlQueriesThreshold: number;
}

/**
 * Defines the thresolds to be used to create alert record and storeAlerts to determine if alert needs to be stored or not.
 */
export class AlertInfo {
  /**
   * Describes whether alerts need to be stored or not at the test level
   */
  public storeAlerts: boolean;

  /**
   * Describes the custom thresholds at test level. If you define these then thresholds will be read from here instead of the JSON
   */
  public thresholds: Thresholds;
}

export interface TestFlowOutput {
  testStepDescription: TestStepDescription;
  result: GovernorMetricsResult;
  alertInfo?: AlertInfo;
  error?: string;
}

/**
 * A function to gather information about a test step
 */
export type FlowStep = () => Promise<TestFlowOutput>;

export interface TestFlowOptions {
  tokenMap?: TokenReplacement[];
}

const DEFAULT_RUN_COUNT = 1;

const FAILED_GOVERNOR_METRICS_RESULT: GovernorMetricsResult = {
  cpuTime: -1,
  dmlRows: -1,
  dmlStatements: -1,
  heapSize: -1,
  queryRows: -1,
  soqlQueries: -1,
  queueableJobs: -1,
  futureCalls: -1,
  timer: -1,
};

const governorMetricKeys = Object.keys(FAILED_GOVERNOR_METRICS_RESULT) as Array<
  keyof GovernorMetricsResult
>;

const resolveExecutionOptions = (
  alertInfoOrRunCount?: AlertInfo | number,
  runCount?: number
): { alertInfo?: AlertInfo; runCount: number } => {
  if (typeof alertInfoOrRunCount === 'number') {
    return { runCount: alertInfoOrRunCount };
  }

  return {
    alertInfo: alertInfoOrRunCount,
    runCount: runCount ?? DEFAULT_RUN_COUNT,
  };
};

const validateRunCount = (runCount: number): void => {
  if (!Number.isInteger(runCount) || runCount < 1) {
    throw new RangeError(
      'runCount must be an integer greater than or equal to 1'
    );
  }
};

const averageResults = (results: TestFlowOutput[]): TestFlowOutput => {
  const [firstResult] = results;

  const averageMetrics = governorMetricKeys.reduce((acc, key) => {
    const total = results.reduce((sum, output) => sum + output.result[key], 0);
    acc[key] = Math.round(total / results.length);
    return acc;
  }, {} as GovernorMetricsResult);

  return {
    testStepDescription: firstResult.testStepDescription,
    result: averageMetrics,
  };
};

export namespace TransactionProcess {
  /**
   * Sets the configuration for the Test Template
   * @param product Product name
   * @param testType defines the use case the test is going to cover, by default Transaction Process
   */
  export const build = async (
    product: string,
    testType: string = TRANSACTION_PROCESS
  ): Promise<TransactionTestTemplate> => {
    const processTestTemplate = new TransactionTestTemplate();
    processTestTemplate.product = product;
    processTestTemplate.flowSteps = [];
    processTestTemplate.flowStepsResults = [];
    processTestTemplate.testType = testType;

    const connectionData = await connectToSalesforceOrg(
      getSalesforceAuthInfoFromEnvVars()
    );
    processTestTemplate.connection = connectionData;

    return processTestTemplate;
  };

  /**
   * Executes Apex code from a file and retrieve the Governor Limits
   * @param processTestTemplate object with all the information required to execute a test
   * @param testStep list of test steps to be executed
   * @param alertInfoOrRunCount alert configuration, or number of runs to execute and average
   * @param runCount number of runs to execute and average when alert info is provided
   */
  export const executeTestStep = async (
    processTestTemplate: TransactionTestTemplate,
    testStep: FlowStep,
    alertInfoOrRunCount?: AlertInfo | number,
    runCount?: number
  ) => {
    const executionOptions = resolveExecutionOptions(
      alertInfoOrRunCount,
      runCount
    );
    validateRunCount(executionOptions.runCount);

    try {
      const results: TestFlowOutput[] = [];
      for (let i = 0; i < executionOptions.runCount; i++) {
        results.push(await testStep());
      }

      const result: TestFlowOutput = averageResults(results);
      result.alertInfo = executionOptions.alertInfo;
      processTestTemplate.flowStepsResults.push(result);
    } catch (e) {
      if (e.testStepDescription) {
        processTestTemplate.flowStepsResults.push({
          testStepDescription: e.testStepDescription,
          error: e.message,
          result: { ...FAILED_GOVERNOR_METRICS_RESULT },
        });
      } else {
        throw e;
      }
    }
  };
}
