/*
 * Copyright (c) 2019 Certinia Inc. All rights reserved.
 */

import Table from "cli-table";
import { apexService } from "../index.js";
import type {
  TransactionTestTemplate,
  TestFlowOutput,
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
  if (results.length > 0) {
    console.log(createTable(results));
  }

  await apexService.save();
};

function createTable(data: TestFlowOutput[]): string {
  return new Table({
    head: [
      "Flow Name",
      "Action",
      "Duration (ms)",
      "CPU time (ms)",
      "DML rows",
      "DML statements",
      "Heap size (bytes)",
      "Query rows",
      "SOQL queries",
      "Queueables",
      "Futures",
    ],
    rows: data.map(({ testStepDescription, result }) => [
      testStepDescription.flowName,
      testStepDescription.action,
      String(result.timer),
      String(result.cpuTime),
      String(result.dmlRows),
      String(result.dmlStatements),
      String(result.heapSize),
      String(result.queryRows),
      String(result.soqlQueries),
      String(result.queueableJobs),
      String(result.futureCalls),
    ]),
  }).toString();
}
