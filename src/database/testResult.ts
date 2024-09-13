/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { TestResult } from './entity/result';
import { getConnection } from './connection';

export async function saveTestResult(testStepResults: TestResult[]) {
  const connection = await getConnection();
  return connection.manager.save(testStepResults);
}

export async function loadTestResults(): Promise<TestResult[]> {
  const connection = await getConnection();
  return connection.manager.find(TestResult);
}
