/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */
// import { expect } from 'chai';
import {
  AlertInfo,
  TransactionTestTemplate,
  TransactionProcess,
  createApexExecutionTestStepFlow,
  saveResults,
} from '../src/';
// import { loadTestResults } from '../src/database/testResult';
//import { cleanDatabase } from './database';

describe('System Test Process', () => {
  let test: TransactionTestTemplate;

  before(async function () {
    // await cleanDatabase();
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

    it('should execute successfully 3rd', async () => {
      const alertInfo = new AlertInfo();
      alertInfo.storeAlerts = true;
      await TransactionProcess.executeTestStep(
        test,
        await createApexExecutionTestStepFlow(
          test.connection,
          __dirname + '/basic.apex',
          { flowName: 'System Test', action: 'alert not needed' }
        ),
        alertInfo
      );
    });
  });

  after(async function () {
    await saveResults(test, test.flowStepsResults);
  });
});
