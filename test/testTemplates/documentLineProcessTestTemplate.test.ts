/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { restore, stub, SinonStub } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as orgService from '../../src/services/org';
import * as resultService from '../../src/services/result';
import {
  DocumentLineProcess,
  DocumentLineProcessTestTemplate,
} from '../../src/testTemplates/documentLineProcessTestTemplate';
import {
  DEFAULT_NUMERIC_VALUE,
  MOCKPRODUCT_FULLNAME,
} from '../../src/shared/constants';
import * as salesforceConnectionHelper from '../../src/services/salesforce/connection';
import { OrgContext } from '../../src/services/org/context';

chai.use(sinonChai);

describe('src/testTemplates/documentLineProcessTestTemplate', () => {
  let reportResultsStub: SinonStub;

  beforeEach(() => {
    reportResultsStub = stub(resultService, 'reportResults').resolves();
    stub(orgService, 'getOrgContext').resolves(
      'testOrgContext' as unknown as OrgContext
    );
    stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves(
      {} as salesforceConnectionHelper.SalesforceConnection
    );
  });

  afterEach(() => {
    restore();
  });

  it('DocumentLineProcess.build returns a DocumentLineProcessTestTemplate instance with a connection ready to be used', async () => {
    // Given
    process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';

    // When
    const dlpTestTemplate: DocumentLineProcessTestTemplate =
      await DocumentLineProcess.build(
        MOCKPRODUCT_FULLNAME,
        10,
        20,
        200,
        'Mock Lines Posting'
      );

    // Then
    expect(dlpTestTemplate.product).to.be.eq(MOCKPRODUCT_FULLNAME);
    expect(dlpTestTemplate.action).to.be.eq('Mock Lines Posting');
    expect(dlpTestTemplate.linesInitial).to.be.eq(10);
    expect(dlpTestTemplate.linesPerIteration).to.be.eq(20);
    expect(dlpTestTemplate.linesMaximum).to.be.eq(200);
    expect(dlpTestTemplate.connection).to.not.be.undefined;
  });

  it('performFlow run until receive timer with -1 duration (flow reached maximum lines)', async () => {
    // Given
    process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
    const dlpTestTemplate: DocumentLineProcessTestTemplate =
      await DocumentLineProcess.build(
        MOCKPRODUCT_FULLNAME,
        50,
        50,
        200,
        'Mock Lines Posting'
      );

    dlpTestTemplate.dataCreation = stub().resolves();
    dlpTestTemplate.dataDeletion = stub().resolves();

    dlpTestTemplate.performFlow = stub().resolves({
      getTime: stub().returns(100),
    });

    // When
    await DocumentLineProcess.performTestFlow(dlpTestTemplate);

    // Then
    expect(reportResultsStub.getCalls()[0].lastArg).to.be.eq('testOrgContext');
  });

  it('performFlow run throws a exception in second execution', async () => {
    // Given
    process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
    const dlpTestTemplate: DocumentLineProcessTestTemplate =
      await DocumentLineProcess.build(
        MOCKPRODUCT_FULLNAME,
        120,
        15,
        DEFAULT_NUMERIC_VALUE,
        'Mock Lines Posting'
      );

    dlpTestTemplate.dataCreation = stub().resolves();
    dlpTestTemplate.dataDeletion = stub().resolves();

    dlpTestTemplate.performFlow = stub()
      .onFirstCall()
      .resolves({
        getTime: stub().returns(100),
      })
      .onSecondCall()
      .rejects({ message: 'Test flow failed' });

    // When
    await DocumentLineProcess.performTestFlow(dlpTestTemplate);

    // Then
    expect(reportResultsStub.args[0][0].length).to.be.eql(2);

    expect(reportResultsStub.args[0][0][0].action).to.be.eql(
      'Mock Lines Posting'
    );
    expect(reportResultsStub.args[0][0][0].lines).to.be.eql(120);
    expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.greaterThan(
      0
    );

    expect(reportResultsStub.args[0][0][1].action).to.be.eql(
      'Mock Lines Posting'
    );
    expect(reportResultsStub.args[0][0][1].lines).to.be.eql(135);
    expect(reportResultsStub.args[0][0][1].timer.getTime()).to.be.lessThan(0);
    expect(reportResultsStub.args[0][0][1].error).to.be.eql('Test flow failed');
  });

  it('performFlow run until it reachs maximum number of lines', async () => {
    // Given
    process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
    const dlpTestTemplate: DocumentLineProcessTestTemplate =
      await DocumentLineProcess.build(
        MOCKPRODUCT_FULLNAME,
        10,
        10,
        50,
        'Mock Lines Posting'
      );

    dlpTestTemplate.dataCreation = stub().resolves();
    dlpTestTemplate.dataDeletion = stub().resolves();

    dlpTestTemplate.performFlow = stub()
      .resolves({
        getTime: stub().returns(150),
      })
      .onFirstCall()
      .resolves({
        getTime: stub().returns(100),
      })
      .onSecondCall()
      .resolves({
        getTime: stub().returns(120),
      });

    // When
    await DocumentLineProcess.performTestFlow(dlpTestTemplate);

    // Then
    expect(reportResultsStub.args[0][0].length).to.be.eql(5);

    expect(reportResultsStub.args[0][0][0].action).to.be.eql(
      'Mock Lines Posting'
    );
    expect(reportResultsStub.args[0][0][0].lines).to.be.eql(10);
    expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.eql(100);

    expect(reportResultsStub.args[0][0][1].action).to.be.eql(
      'Mock Lines Posting'
    );
    expect(reportResultsStub.args[0][0][1].lines).to.be.eql(20);
    expect(reportResultsStub.args[0][0][1].timer.getTime()).to.be.eql(120);

    expect(reportResultsStub.args[0][0][4].action).to.be.eql(
      'Mock Lines Posting'
    );
    expect(reportResultsStub.args[0][0][4].lines).to.be.eql(50);
    expect(reportResultsStub.args[0][0][4].timer.getTime()).to.be.eql(150);
  });
});
