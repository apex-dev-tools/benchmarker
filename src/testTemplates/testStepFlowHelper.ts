/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import type { Connection } from "@salesforce/core";
import type { LimitsContext } from "../benchmark/limits/schemas.js";
import {
  type LimitsBenchmarkRequest,
  type LimitsBenchmarkRun,
} from "../service/apex.js";
import { LegacyBenchmarkService } from "./service.js";
import type {
  AlertInfo,
  FlowStep,
  TestFlowOptions,
  TestFlowOutput,
  TestStepDescription,
  TokenReplacement,
} from "./transactionTestTemplate.js";

/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexScriptPath path of the file the Apex code to be executed
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 * @param [testFlowOptions] optional, replaces values in the Apex scripts, for examples datetimes values
 */
export const createApexExecutionTestStepFlow = (
  connection: Connection,
  apexScriptPath: string,
  testStepDescription: TestStepDescription,
  testFlowOptions?: TestFlowOptions
): Promise<FlowStep> => {
  return Promise.resolve(
    toFlowStep(testStepDescription, {
      paths: [apexScriptPath],
      parserOptions: { replace: toReplaceDict(testFlowOptions?.tokenMap) },
    })
  );
};

/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexCode the apex code which the FlowStep object should be constructed with
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 */
export const createApexExecutionTestStepFlowFromApex = (
  connection: Connection,
  apexCode: string,
  testStepDescription: TestStepDescription
): Promise<FlowStep> => {
  return Promise.resolve(
    toFlowStep(testStepDescription, {
      code: apexCode,
    })
  );
};

// Compatibility functions to new API

function toFlowStep(
  testStepDescription: TestStepDescription,
  request: LimitsBenchmarkRequest
): FlowStep {
  return async alertInfo => {
    const { flowName, action, additionalData } = testStepDescription;

    const result = await LegacyBenchmarkService.default.benchmarkLimits({
      ...request,
      options: {
        id: {
          name: flowName,
          action,
        },
        context: toLimitsContext(alertInfo, additionalData),
      },
    });

    return toTestFlowOutput(testStepDescription, result);
  };
}

function toLimitsContext(alertInfo?: AlertInfo, data?: string): LimitsContext {
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
    data,
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
  result: LimitsBenchmarkRun
): TestFlowOutput {
  const { flowName, action } = testStepDescription;
  const lastError = result.errors && result.errors.at(-1);
  if (lastError) {
    const { error } = lastError;
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
