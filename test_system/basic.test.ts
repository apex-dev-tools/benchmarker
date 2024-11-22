/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */
// import { expect } from 'chai';
import {
  AlertInfo,
  Threshold,
  TransactionTestTemplate,
  TransactionProcess,
  createApexExecutionTestStepFlow,
  saveResults,
} from '../src/';
// import { loadTestResults } from '../src/database/testResult';
import { cleanDatabase } from './database';

describe('System Test Process', () => {
  let test: TransactionTestTemplate;

  before(async function () {
    await cleanDatabase();
    test = await TransactionProcess.build('MockProduct');
  });

  describe('Flow', function () {
    it('should execute successfully', async () => {
      const alertInfo = new AlertInfo();
      alertInfo.storeAlerts = true;

      await TransactionProcess.executeTestStep(
        test,
        await createApexExecutionTestStepFlow(
          test.connection,
          __dirname + '/basic.apex',
          { flowName: 'System Test', action: 'run system test' }
        ),
        alertInfo
      );
    });

    it('should execute successfully 2nd', async () => {
      const alertInfo = new AlertInfo();
      alertInfo.storeAlerts = true;

      const thresolds = new Threshold();
      thresolds.cpuTimeThreshold = 100;
      thresolds.dmlRowThreshold = 0;
      thresolds.dmlStatementThreshold = 0;
      thresolds.durationThreshold = 0;
      thresolds.heapSizeThreshold = 1000;
      thresolds.queryRowsThreshold = 0;
      thresolds.soqlQueriesThreshold = 0;

      alertInfo.thresolds = thresolds;

      await TransactionProcess.executeTestStep(
        test,
        await createApexExecutionTestStepFlow(
          test.connection,
          __dirname + '/basic.apex',
          { flowName: 'System Test', action: 'run system test 2' }
        ),
        alertInfo
      );
    });

    it('should execute successfully 3rd', async () => {
      await TransactionProcess.executeTestStep(
        test,
        await createApexExecutionTestStepFlow(
          test.connection,
          __dirname + '/basic.apex',
          { flowName: 'System Test', action: 'alert not needed' }
        )
      );
    });
  });

  after(async function () {
    await saveResults(test, test.flowStepsResults);
  });
});
