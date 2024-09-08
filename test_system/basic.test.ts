/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */
import { expect } from 'chai';
import {
  TransactionTestTemplate,
  TransactionProcess,
  createApexExecutionTestStepFlow,
  saveResults,
} from '../src/';
import { loadTestResults } from '../src/database/testResult';
import { cleanDatabase } from './database';

describe('System Test Process', () => {
  let test: TransactionTestTemplate;

  before(async function () {
    await cleanDatabase();
    test = await TransactionProcess.build('MockProduct');
  });

  describe('Flow', function () {
    it('should execute successfully', async () => {
      await TransactionProcess.executeTestStep(
        test,
        await createApexExecutionTestStepFlow(
          test.connection,
          __dirname + '/basic.apex',
          { flowName: 'System Test', action: 'run system test' }
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
      expect(result.queueableJobs).to.be.equal(0);
      expect(result.futureCalls).to.be.equal(0);
    });
  });
});
