/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */
import { SalesforceConnection } from '../services/salesforce/connection';
import {
  FlowStep,
  TestStepDescription,
  TestFlowOptions,
  TestFlowOutput,
} from './transactionTestTemplate';
import { apexService } from '..';
import { ApexBenchmarkResult } from '../service/apex';

/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexScriptPath path of the file the Apex code to be executed
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 * @param [testFlowOptions] optional, replaces values in the Apex scripts, for examples datetimes values
 */
export const createApexExecutionTestStepFlow = async (
  connection: SalesforceConnection,
  apexScriptPath: string,
  testStepDescription: TestStepDescription,
  testFlowOptions?: TestFlowOptions
): Promise<FlowStep> => {
  return async () => {
    const { flowName, action } = testStepDescription;
    console.log(`Executing ${flowName} - ${action} performance test...`);

    const result = await apexService.benchmarkFile(apexScriptPath, {
      name: flowName,
      actions: [action],
      tokens: testFlowOptions?.tokenMap,
    });

    return toFlowOutput(testStepDescription, result);
  };
};
/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexCode the apex code which the FlowStep object should be constructed with
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 */
export const createApexExecutionTestStepFlowFromApex = async (
  connection: SalesforceConnection,
  apexCode: string,
  testStepDescription: TestStepDescription
): Promise<FlowStep> => {
  return async () => {
    const { flowName, action } = testStepDescription;
    console.log(`Executing ${flowName} - ${action} performance test...`);

    const result = await apexService.benchmarkCode(apexCode, {
      name: flowName,
      actions: [action],
    });

    return toFlowOutput(testStepDescription, result);
  };
};

function toFlowOutput(
  testStepDescription: TestStepDescription,
  result: ApexBenchmarkResult
): TestFlowOutput {
  const { flowName, action } = testStepDescription;
  if (result.errors.length != 0) {
    const { error } = result.errors[0];
    console.log(
      `Failure during ${flowName} - ${action} process execution: ${error.message}`
    );
    throw error;
  }

  if (result.benchmarks.length == 0) {
    throw new Error(`No results available for ${flowName} - ${action}.`);
  }

  return {
    testStepDescription,
    result: result.benchmarks[0].limits,
  };
}
