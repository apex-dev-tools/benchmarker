/**
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { TestResult } from '../src/database/entity/result';
import { saveTestResult } from '../src/database/testResult';

function createTestResult(
  action: string,
  flowName: string,
  product: string,
  testType: string
): TestResult {
  const r: TestResult = new TestResult();
  r.flowName = flowName;
  r.action = action;
  r.product = product;
  r.testType = testType;

  r.cpuTime = Math.floor(Math.random() * 250 + 100);
  r.dmlRows = 50;
  r.dmlStatements = 50;
  r.heapSize = 75;
  r.queryRows = 0;
  r.soqlQueries = 0;
  r.queueableJobs = 0;
  r.futureCalls = 0;

  return r;
}

export async function createSampleAlertTestData(
  action: string,
  flowName: string,
  product: string,
  testType: string,
  count: number = 5
): Promise<void> {
  const results: TestResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push(createTestResult(action, flowName, product, testType));
  }

  await saveTestResult(results);
}
