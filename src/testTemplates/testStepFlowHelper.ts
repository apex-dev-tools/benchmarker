/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import {
  FlowStep,
  TestStepDescription,
  TestFlowOptions,
  TestFlowOutput,
  AlertInfo,
  TokenReplacement,
} from './transactionTestTemplate';
import { apexService } from '..';
import { Connection } from '@salesforce/core';
import { BenchmarkSingleResult } from '../service/apex';
import { LimitsContext } from '../benchmark/apex/schemas';

/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexScriptPath path of the file the Apex code to be executed
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 * @param [testFlowOptions] optional, replaces values in the Apex scripts, for examples datetimes values
 */
export const createApexExecutionTestStepFlow = async (
  connection: Connection,
  apexScriptPath: string,
  testStepDescription: TestStepDescription,
  testFlowOptions?: TestFlowOptions
): Promise<FlowStep> => {
  return async alertInfo => {
    const { flowName, action, additionalData } = testStepDescription;
    console.log(`Executing '${flowName} - ${action}' performance test...`);

    const result = await apexService.benchmarkFile(apexScriptPath, {
      name: flowName,
      actions: [
        {
          name: action,
          context: toLimitsContext(alertInfo, additionalData),
        },
      ],
      parser: { replace: toReplaceDict(testFlowOptions?.tokenMap) },
    });

    return toTestFlowOutput(testStepDescription, result);
  };
};

/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexCode the apex code which the FlowStep object should be constructed with
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 */
export const createApexExecutionTestStepFlowFromApex = async (
  connection: Connection,
  apexCode: string,
  testStepDescription: TestStepDescription
): Promise<FlowStep> => {
  return async alertInfo => {
    const { flowName, action, additionalData } = testStepDescription;
    console.log(`Executing '${flowName} - ${action}' performance test...`);

    const result = await apexService.benchmarkCode(apexCode, {
      name: flowName,
      actions: [
        {
          name: action,
          context: toLimitsContext(alertInfo, additionalData),
        },
      ],
    });

    return toTestFlowOutput(testStepDescription, result);
  };
};

// Compatibility functions to new API

function toLimitsContext(
  alertInfo?: AlertInfo,
  jsonData?: string
): LimitsContext {
  const { storeAlerts, thresholds } = alertInfo || {};

  return {
    enableMetrics: storeAlerts,
    thresholds: {
      cpuTime: thresholds?.cpuTimeThreshold,
      dmlRows: thresholds?.dmlRowThreshold,
      dmlStatements: thresholds?.dmlStatementThreshold,
      heapSize: thresholds?.heapSizeThreshold,
      queryRows: thresholds?.queryRowsThreshold,
      soqlQueries: thresholds?.soqlQueriesThreshold,
    },
    jsonData,
  };
}

function toReplaceDict(
  tokens?: TokenReplacement[]
): Record<string, string> | undefined {
  return tokens?.reduce<Record<string, string>>((dict, { token, value }) => {
    dict[token] = value;
    return dict;
  }, {});
}

function toTestFlowOutput(
  testStepDescription: TestStepDescription,
  result: BenchmarkSingleResult
): TestFlowOutput {
  const { flowName, action } = testStepDescription;
  if (result.error) {
    const { error } = result.error;
    console.log(
      `Failure during '${flowName} - ${action}' process execution: ${error.message}`
    );
    throw error;
  }

  if (result.benchmarks.length == 0) {
    throw new Error(`No results available for '${flowName} - ${action}'.`);
  }

  const { duration, ...data } = result.benchmarks[0].data;

  return {
    testStepDescription,
    result: { ...data, timer: duration },
  };
}
