/*
 * Copyright (c) 2019 Certinia Inc. All rights reserved.
 */

import { LegacyBenchmarkService } from "./service.js";
import type {
  TestFlowOutput,
  TransactionTestTemplate,
} from "./transactionTestTemplate.js";

/**
 * Retrieve peformance metrics from a tests execution and save them
 * @param processTestTemplate object with the information required to execute a test
 * @param results results of the test steps executions
 */
export const saveResults = async (
  processTestTemplate: TransactionTestTemplate,
  results: TestFlowOutput[]
) => {
  await LegacyBenchmarkService.default.saveLimits();
};
