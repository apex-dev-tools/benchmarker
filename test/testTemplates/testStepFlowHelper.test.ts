/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { restore } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as fileSystem from '../../src/services/filesystem';
import * as salesforceUtils from '../../src/services/salesforce/utils';
import sinon from 'sinon';
import {
  TestStepDescription,
  GovernorMetricsResult,
  FlowStep,
  TestFlowOutput,
} from '../../src/testTemplates/transactionTestTemplate';
import {
  createApexExecutionTestStepFlow,
  createApexExecutionTestStepFlowFromApex,
} from '../../src/testTemplates/testStepFlowHelper';
import { SalesforceConnection } from '../../src/services/salesforce/connection';
import moment from 'moment';
import { TokenReplacement } from '../../src/services/tokenReplacement';

chai.use(sinonChai);

describe('src/testTemplates/testStepFlowHelper', () => {
  afterEach(() => {
    restore();
  });

  it('createApexExecutionTestStepFlow returns a FlowStep', async () => {
    // Given
    const testFakeScript = 'System.debug();';
    const testStepFakeDescription: TestStepDescription = {
      action: 'testStepAction',
      flowName: 'testStepFlowName',
    };

    sinon.stub(fileSystem, 'readFile').resolves(testFakeScript);

    const governorMetricsResult: GovernorMetricsResult = {
      cpuTime: 1,
      dmlRows: 1,
      dmlStatements: 1,
      heapSize: 1,
      queryRows: 1,
      soqlQueries: 1,
      queueableJobs: 1,
      futureCalls: 1,
      timer: 1,
    };
    sinon
      .stub(salesforceUtils, 'extractGovernorMetricsFromGenericApexFlow')
      .resolves(governorMetricsResult);

    // When
    const resultOfApexExecutionStepCreation: FlowStep =
      await createApexExecutionTestStepFlow(
        {} as SalesforceConnection,
        'fake/path',
        testStepFakeDescription
      );
    // Then
    expect(resultOfApexExecutionStepCreation).to.not.be.undefined;

    // When
    const resultOfApexTestStepExecution: TestFlowOutput =
      await resultOfApexExecutionStepCreation();
    expect(resultOfApexTestStepExecution.testStepDescription).to.be.equals(
      testStepFakeDescription
    );
    expect(resultOfApexTestStepExecution.result).to.be.equals(
      governorMetricsResult
    );
    expect(resultOfApexTestStepExecution.error).to.be.undefined;
  });

  it('createApexExecutionTestStepFlow replace tokens and returns a FlowStep', async () => {
    // Given
    const testFakeScript = `System.debug();
		String date = %date_1`;

    const tokenReplacement: TokenReplacement = {
      token: '%date_1',
      value: moment().format('DD/MM/YYYY'),
    };

    const testStepFakeDescription: TestStepDescription = {
      action: 'testStepAction',
      flowName: 'testStepFlowName',
    };

    sinon
      .stub(fileSystem, 'readFile')
      .withArgs('fake/path')
      .resolves(testFakeScript);

    const governorMetricsResult: GovernorMetricsResult = {
      cpuTime: 1,
      dmlRows: 1,
      dmlStatements: 1,
      heapSize: 1,
      queryRows: 1,
      soqlQueries: 1,
      queueableJobs: 1,
      futureCalls: 1,
      timer: 1,
    };
    const extractGovernorMetricsFromGenericApexFlowStub = sinon
      .stub(salesforceUtils, 'extractGovernorMetricsFromGenericApexFlow')
      .resolves(governorMetricsResult);

    // When
    const resultOfApexExecutionStepCreation: FlowStep =
      await createApexExecutionTestStepFlow(
        {} as SalesforceConnection,
        'fake/path',
        testStepFakeDescription,
        { tokenMap: [tokenReplacement] }
      );
    // Then
    expect(resultOfApexExecutionStepCreation).to.not.be.undefined;

    // When
    const resultOfApexTestStepExecution: TestFlowOutput =
      await resultOfApexExecutionStepCreation();
    expect(
      extractGovernorMetricsFromGenericApexFlowStub.args[0][2]
    ).to.contains(tokenReplacement.value);
    expect(
      extractGovernorMetricsFromGenericApexFlowStub.args[0][2]
    ).to.not.contains(tokenReplacement.token);
    expect(resultOfApexTestStepExecution.testStepDescription).to.be.equals(
      testStepFakeDescription
    );
    expect(resultOfApexTestStepExecution.result).to.be.equals(
      governorMetricsResult
    );
    expect(resultOfApexTestStepExecution.error).to.be.undefined;
  });

  it('createApexExecutionTestStepFlowFromApex returns FlowStep object with given apex code', async () => {
    // Given
    const testFakeScript = `System.debug();
		Date date = Date.newInstance(2015, 10, 21);`;

    const testStepFakeDescription: TestStepDescription = {
      action: 'testStepAction',
      flowName: 'testStepFlowName',
    };

    const governorMetricsResult: GovernorMetricsResult = {
      cpuTime: 1,
      dmlRows: 1,
      dmlStatements: 1,
      heapSize: 1,
      queryRows: 1,
      soqlQueries: 1,
      queueableJobs: 1,
      futureCalls: 1,
      timer: 1,
    };
    const extractGovernorMetricsFromGenericApexFlowStub = sinon
      .stub(salesforceUtils, 'extractGovernorMetricsFromGenericApexFlow')
      .resolves(governorMetricsResult);

    // When
    const resultOfApexExecutionStepCreation: FlowStep =
      await createApexExecutionTestStepFlowFromApex(
        {} as SalesforceConnection,
        testFakeScript,
        testStepFakeDescription
      );
    // Then
    expect(resultOfApexExecutionStepCreation).to.not.be.undefined;

    // When
    const resultOfApexTestStepExecution: TestFlowOutput =
      await resultOfApexExecutionStepCreation();
    expect(
      extractGovernorMetricsFromGenericApexFlowStub.args[0][2]
    ).to.be.equals(testFakeScript);
    expect(resultOfApexTestStepExecution.testStepDescription).to.be.equals(
      testStepFakeDescription
    );
    expect(resultOfApexTestStepExecution.result).to.be.equals(
      governorMetricsResult
    );
    expect(resultOfApexTestStepExecution.error).to.be.undefined;
  });
});
