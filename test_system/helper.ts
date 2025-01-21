/**
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { TestResult, Timer } from '../src';
import { saveTestResult } from '../src/database/testResult';
import {
  convertOutputToTestResult,
  TestResultOutput,
} from '../src/services/result/output';

// Count of test result will store in the database.
const NUMBER_OF_TEST_RESULT = 5;

// This method will return test result object.
function createTestResultOutput(
  action: string,
  flowName: string,
  product: string,
  testType: string
): TestResultOutput {
  return {
    timer: new Timer('1000'),
    action: action,
    flowName: flowName,
    product: product,
    testType: testType,
    cpuTime: Math.floor(Math.random() * 250 + 100),
    dmlRows: 50,
    dmlStatements: 50,
    heapSize: 75,
    queryRows: 0,
    soqlQueries: 0,
  };
}

// This method will convert Test result output array to Test result array.
function bulkConversionToTestResult(
  inputTestResults: TestResultOutput[]
): TestResult[] {
  return inputTestResults.map((inputTestResult: TestResultOutput) =>
    convertOutputToTestResult(inputTestResult)
  );
}

export async function createSampleAlertTestData(
  action: string,
  flowName: string,
  product: string,
  testType: string
) {
  const inputTestResults: TestResultOutput[] = [
    ...Array(NUMBER_OF_TEST_RESULT),
  ].map(() => {
    return createTestResultOutput(action, flowName, product, testType);
  });
  const sampleTestResults: TestResult[] =
    bulkConversionToTestResult(inputTestResults);
  await saveTestResult(sampleTestResults);
}
