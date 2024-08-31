/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { restore, stub } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import { MOCKPRODUCT_FULLNAME } from '../../src/shared/constants';
import * as salesforceConnectionHelper from '../../src/services/salesforce/connection';
import {
  TransactionTestTemplate,
  TransactionProcess,
  FlowStep,
  TestFlowOutput,
} from '../../src/testTemplates/transactionTestTemplate';
import * as utils from '../../src/services/salesforce/utils';

chai.use(sinonChai);

describe('src/testTemplates/transactionTestTemplate', () => {
  beforeEach(() => {
    stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves(
      {} as salesforceConnectionHelper.SalesforceConnection
    );
  });

  afterEach(() => {
    restore();
  });
  describe('TransactionProcess.build', () => {
    it('returns a TransactionTestTemplate instance with a connection ready to be used', async () => {
      // Given
      stub(utils, 'sobject').returns({
        create: stub(),
      });

      // When
      const test: TransactionTestTemplate =
        await TransactionProcess.build(MOCKPRODUCT_FULLNAME);

      // Then
      expect(test.product).to.be.eq(MOCKPRODUCT_FULLNAME);
      expect(test.connection).to.not.be.undefined;
      expect(test.flowSteps).to.not.be.undefined;
      expect(test.flowStepsResults).to.not.be.undefined;
    });
  });

  describe('TransactionProcess.executeTestStep', () => {
    it('resolves and save results', async () => {
      // Given
      stub(utils, 'sobject').returns({
        create: stub(),
      });

      // When
      const test: TransactionTestTemplate =
        await TransactionProcess.build(MOCKPRODUCT_FULLNAME);
      const result: TestFlowOutput = {
        testStepDescription: {
          action: 'Mock action',
          flowName: 'Mock flow name',
        },
        result: {
          timer: 1,
          cpuTime: 2,
          dmlRows: 3,
          dmlStatements: 4,
          heapSize: 5,
          queryRows: 6,
          soqlQueries: 7,
          queueableJobs: 8,
          futureCalls: 9,
        },
      };
      const flowStep: FlowStep = stub().resolves(result);
      await TransactionProcess.executeTestStep(test, flowStep);

      // Then
      expect(test.flowStepsResults[0].testStepDescription.action).to.be.eq(
        'Mock action'
      );
      expect(test.flowStepsResults[0].testStepDescription.flowName).to.be.eq(
        'Mock flow name'
      );
      expect(test.flowStepsResults[0].result.timer).to.be.equal(1);
      expect(test.flowStepsResults[0].result.cpuTime).to.be.equal(2);
      expect(test.flowStepsResults[0].result.dmlRows).to.be.equal(3);
      expect(test.flowStepsResults[0].result.dmlStatements).to.be.equal(4);
      expect(test.flowStepsResults[0].result.heapSize).to.be.equal(5);
      expect(test.flowStepsResults[0].result.queryRows).to.be.equal(6);
      expect(test.flowStepsResults[0].result.soqlQueries).to.be.equal(7);
      expect(test.flowStepsResults[0].result.queueableJobs).to.be.equal(8);
      expect(test.flowStepsResults[0].result.futureCalls).to.be.equal(9);
    });

    it('fails and save the result as status is failed', async () => {
      // Given
      stub(utils, 'sobject').returns({
        create: stub(),
      });

      // When
      const test: TransactionTestTemplate =
        await TransactionProcess.build(MOCKPRODUCT_FULLNAME);
      const flowStep: FlowStep = stub().rejects({
        testStepDescription: {
          action: 'Mock action',
          flowName: 'Mock flow name',
        },
      });
      await TransactionProcess.executeTestStep(test, flowStep);

      // Then
      expect(test.flowStepsResults[0].testStepDescription.action).to.be.eq(
        'Mock action'
      );
      expect(test.flowStepsResults[0].testStepDescription.flowName).to.be.eq(
        'Mock flow name'
      );
      expect(test.flowStepsResults[0].result.cpuTime).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.dmlRows).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.dmlStatements).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.heapSize).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.queryRows).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.soqlQueries).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.queueableJobs).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.futureCalls).to.be.equal(-1);
      expect(test.flowStepsResults[0].result.timer).to.be.equal(-1);
    });

    it('throws unexpected error', async () => {
      // Given
      stub(utils, 'sobject').returns({
        create: stub(),
      });
      const test: TransactionTestTemplate =
        await TransactionProcess.build(MOCKPRODUCT_FULLNAME);
      const flowStep: FlowStep = stub().rejects(new Error('Unexpected error'));

      // When
      try {
        await TransactionProcess.executeTestStep(test, flowStep);
        // If the execution reaches this point, the test should fail
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        // Then
        expect(error).to.be.instanceof(Error);
        expect((error as Error).message).to.equal('Unexpected error');
      }
    });
  });
});
