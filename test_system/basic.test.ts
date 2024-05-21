import {
  TransactionTestTemplate,
  TransactionProcess,
  createApexExecutionTestStepFlow,
  saveResults,
} from '../src/';

describe('System Test Process', () => {
  let test: TransactionTestTemplate;

  before(async function () {
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
    });

    after('Display/Save Results', async () => {
      await saveResults(test, test.flowStepsResults);
    });
  });
});
