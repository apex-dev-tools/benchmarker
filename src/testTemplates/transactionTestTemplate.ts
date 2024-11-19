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
import { getThresholds } from '../shared/env';

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
}

export class Threshold {
  cpuTimeThreshold: number;
  durationThreshold: number;
  dmlStatementThreshold: number;
  dmlRowThreshold: number;
  heapSizeThreshold: number;
  queryRowsThreshold: number;
  soqlQueriesThreshold: number;
}

export class AlertInfo {
  storeAlerts: boolean;
  thresolds: Threshold;
}

export interface TestFlowOutput {
  testStepDescription: TestStepDescription;
  result: GovernorMetricsResult;
  alertThresolds?: Threshold;
  error?: string;
}

/**
 * A function to gather information about a test step
 */
export type FlowStep = () => Promise<TestFlowOutput>;

export interface TestFlowOptions {
  tokenMap?: TokenReplacement[];
}

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
   */
  export const executeTestStep = async (
    processTestTemplate: TransactionTestTemplate,
    testStep: FlowStep,
    alertInfo?: AlertInfo
  ) => {
    try {
      const result: TestFlowOutput = await testStep();
      // populating results to also store the thresholds
      storeAlertThresholds(result, alertInfo);
      processTestTemplate.flowStepsResults.push(result);
    } catch (e) {
      if (e.testStepDescription) {
        processTestTemplate.flowStepsResults.push({
          testStepDescription: e.testStepDescription,
          error: e.message,
          result: {
            cpuTime: -1,
            dmlRows: -1,
            dmlStatements: -1,
            heapSize: -1,
            queryRows: -1,
            soqlQueries: -1,
            queueableJobs: -1,
            futureCalls: -1,
            timer: -1,
          },
          alertThresolds: new Threshold(),
        });
      } else {
        throw e;
      }
    }
  };
}

function storeAlertThresholds(result: TestFlowOutput, alertInfo?: AlertInfo) {
  if (alertInfo && alertInfo.storeAlerts === true) {
    if (alertInfo.thresolds) {
      result.alertThresolds = alertInfo.thresolds;
    } else {
      result.alertThresolds = getThresholds();
    }
  }
}
