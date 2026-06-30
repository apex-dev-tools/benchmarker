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
  Thresholds,
  AlertInfo,
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

    it('resolves and save results with alert info', async () => {
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
      const alertInfo: AlertInfo = {
        storeAlerts: true,
        thresholds: {
          cpuTimeThreshold: 1,
          dmlStatementThreshold: 2,
          dmlRowThreshold: 3,
          heapSizeThreshold: 4,
          queryRowsThreshold: 5,
          soqlQueriesThreshold: 6,
        },
      };

      const flowStep: FlowStep = stub().resolves(result);
      await TransactionProcess.executeTestStep(test, flowStep, alertInfo);

      // Then
      expect(test.flowStepsResults[0].testStepDescription.action).to.be.eq(
        'Mock action'
      );
      expect(test.flowStepsResults[0].testStepDescription.flowName).to.be.eq(
        'Mock flow name'
      );
      expect(test.flowStepsResults[0].result).to.be.not.null;

      const thresholds = test.flowStepsResults[0].alertInfo?.thresholds;

      expect(
        (test.flowStepsResults[0].alertInfo as AlertInfo).storeAlerts
      ).to.be.equal(true);
      expect((thresholds as Thresholds).cpuTimeThreshold).to.be.equal(1);
      expect((thresholds as Thresholds).dmlStatementThreshold).to.be.equal(2);
      expect((thresholds as Thresholds).dmlRowThreshold).to.be.equal(3);
      expect((thresholds as Thresholds).heapSizeThreshold).to.be.equal(4);
      expect((thresholds as Thresholds).queryRowsThreshold).to.be.equal(5);
      expect((thresholds as Thresholds).soqlQueriesThreshold).to.be.equal(6);
    });

    it('runs a test step multiple times and saves a single averaged result', async () => {
      // Given
      stub(utils, 'sobject').returns({
        create: stub(),
      });

      // When
      const test: TransactionTestTemplate =
        await TransactionProcess.build(MOCKPRODUCT_FULLNAME);
      const flowStep = stub();
      flowStep.onFirstCall().resolves({
        testStepDescription: {
          action: 'Mock action',
          flowName: 'Mock flow name',
        },
        result: {
          timer: 10,
          cpuTime: 20,
          dmlRows: 30,
          dmlStatements: 40,
          heapSize: 50,
          queryRows: 60,
          soqlQueries: 70,
          queueableJobs: 80,
          futureCalls: 90,
        },
      });
      flowStep.onSecondCall().resolves({
        testStepDescription: {
          action: 'Mock action',
          flowName: 'Mock flow name',
        },
        result: {
          timer: 20,
          cpuTime: 30,
          dmlRows: 40,
          dmlStatements: 50,
          heapSize: 60,
          queryRows: 70,
          soqlQueries: 80,
          queueableJobs: 90,
          futureCalls: 100,
        },
      });
      flowStep.onThirdCall().resolves({
        testStepDescription: {
          action: 'Mock action',
          flowName: 'Mock flow name',
        },
        result: {
          timer: 30,
          cpuTime: 40,
          dmlRows: 50,
          dmlStatements: 60,
          heapSize: 70,
          queryRows: 80,
          soqlQueries: 90,
          queueableJobs: 100,
          futureCalls: 110,
        },
      });

      await TransactionProcess.executeTestStep(test, flowStep, 3);

      // Then
      expect(flowStep).to.have.been.calledThrice;
      expect(test.flowStepsResults).to.have.length(1);
      expect(test.flowStepsResults[0].result.timer).to.be.equal(20);
      expect(test.flowStepsResults[0].result.cpuTime).to.be.equal(30);
      expect(test.flowStepsResults[0].result.dmlRows).to.be.equal(40);
      expect(test.flowStepsResults[0].result.dmlStatements).to.be.equal(50);
      expect(test.flowStepsResults[0].result.heapSize).to.be.equal(60);
      expect(test.flowStepsResults[0].result.queryRows).to.be.equal(70);
      expect(test.flowStepsResults[0].result.soqlQueries).to.be.equal(80);
      expect(test.flowStepsResults[0].result.queueableJobs).to.be.equal(90);
      expect(test.flowStepsResults[0].result.futureCalls).to.be.equal(100);
    });

    it('runs a test step multiple times with alert info', async () => {
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
      const alertInfo: AlertInfo = {
        storeAlerts: true,
        thresholds: {
          cpuTimeThreshold: 1,
          dmlStatementThreshold: 2,
          dmlRowThreshold: 3,
          heapSizeThreshold: 4,
          queryRowsThreshold: 5,
          soqlQueriesThreshold: 6,
        },
      };
      const flowStep: FlowStep = stub().resolves(result);

      await TransactionProcess.executeTestStep(test, flowStep, alertInfo, 2);

      // Then
      expect(flowStep).to.have.been.calledTwice;
      expect(test.flowStepsResults).to.have.length(1);
      expect(test.flowStepsResults[0].alertInfo).to.be.equal(alertInfo);
    });

    it('throws when run count is less than one', async () => {
      // Given
      stub(utils, 'sobject').returns({
        create: stub(),
      });
      const test: TransactionTestTemplate =
        await TransactionProcess.build(MOCKPRODUCT_FULLNAME);
      const flowStep: FlowStep = stub().resolves();

      // When
      try {
        await TransactionProcess.executeTestStep(test, flowStep, 0);
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        // Then
        expect(error).to.be.instanceof(RangeError);
        expect((error as Error).message).to.equal(
          'runCount must be an integer greater than or equal to 1'
        );
      }
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
