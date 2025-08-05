/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from "chai";
import {
  TransactionProcess,
  type TransactionTestTemplate,
  createApexExecutionTestStepFlow,
  saveResults,
} from "../src/index.js";
import { cleanDatabase, loadEnv, loadTestResults, restore } from "./helper.js";

describe("async", () => {
  let test: TransactionTestTemplate;

  before(async () => {
    restore();
    loadEnv({
      BENCH_POSTGRES_LEGACY: "true",
    });

    test = await TransactionProcess.build("MockProduct");

    await cleanDatabase();
  });

  it("should execute successfully", async () => {
    await TransactionProcess.executeTestStep(
      test,
      await createApexExecutionTestStepFlow(
        test.connection,
        __dirname + "/scripts/async.apex",
        { flowName: "Async system test", action: "Run" }
      )
    );

    await saveResults(test, test.flowStepsResults);

    const results = await loadTestResults();
    expect(results.length).to.be.equal(1);
    const result = results[0];
    expect(result.cpuTime).to.be.above(0);
    expect(result.dmlRows).to.be.equal(0);
    expect(result.dmlStatements).to.be.equal(0);
    expect(result.heapSize).to.be.above(0);
    expect(result.queryRows).to.be.equal(0);
    expect(result.soqlQueries).to.be.equal(0);
    expect(result.queueableJobs).to.be.equal(1);
    expect(result.futureCalls).to.be.equal(0);
  });
});
