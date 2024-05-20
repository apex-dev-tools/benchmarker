/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { restore, stub, SinonStub } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as orgService from '../../src/services/org';
import * as resultService from '../../src/services/result';
import {
  BulkDocumentProcessTestTemplate,
  BulkDocumentProcess,
} from '../../src/testTemplates/bulkDocumentProcessTestTemplate';
import { MOCKPRODUCT_FULLNAME } from '../../src/shared/constants';
import * as salesforceConnectionHelper from '../../src/services/salesforce/connection';
import { OrgContext } from '../../src/services/org/context';

chai.use(sinonChai);

describe('src/testTemplates/bulkDocumentProcessTestTemplate', () => {
  let reportResultsStub: SinonStub;

  beforeEach(() => {
    reportResultsStub = stub(resultService, 'reportResults').resolves();
    stub(orgService, 'getOrgContext').resolves({} as unknown as OrgContext);
    stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves(
      {} as salesforceConnectionHelper.SalesforceConnection
    );
  });

  afterEach(() => {
    restore();
  });

  it('BulkDocumentProcess.build returns a BulkDocumentProcessTestTemplate instance with a connection ready to be used', async () => {
    // Given
    process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';

    // When
    const dpTestTemplate: BulkDocumentProcessTestTemplate =
      await BulkDocumentProcess.build(
        MOCKPRODUCT_FULLNAME,
        10,
        100,
        1000,
        10,
        20,
        200,
        'Mock Documents Posting'
      );

    // Then
    expect(dpTestTemplate.product).to.be.eq(MOCKPRODUCT_FULLNAME);
    expect(dpTestTemplate.action).to.be.eq('Mock Documents Posting');
    expect(dpTestTemplate.nDocumentsInitial).to.be.eq(10);
    expect(dpTestTemplate.nDocumentsPerIteration).to.be.eq(100);
    expect(dpTestTemplate.nDocumentsMaximum).to.be.eq(1000);
    expect(dpTestTemplate.nLinesInitial).to.be.eq(10);
    expect(dpTestTemplate.nLinesIteration).to.be.eq(20);
    expect(dpTestTemplate.nLinesMaximum).to.be.eq(200);
    expect(dpTestTemplate.connection).to.not.be.undefined;
  });

  it('performFlow run until receive timer with -1 duration (flow reached maximum document and maximum lines)', async () => {
    // Given
    process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
    const dpTestTemplate: BulkDocumentProcessTestTemplate =
      await BulkDocumentProcess.build(
        MOCKPRODUCT_FULLNAME,
        100,
        100,
        1000,
        50,
        50,
        500,
        'Mock Documents Posting'
      );

    dpTestTemplate.dataCreation = stub().resolves();
    dpTestTemplate.dataDeletion = stub().resolves();

    dpTestTemplate.performFlow = stub().resolves({
      getTime: stub().returns(100),
    });

    // When
    await BulkDocumentProcess.performTestFlow(dpTestTemplate);

    // Then
    expect(reportResultsStub.args[0][0].length).to.be.eql(100);

    expect(reportResultsStub.args[0][0][0].action).to.be.eql(
      'Mock Documents Posting'
    );
    expect(reportResultsStub.args[0][0][0].lines).to.be.eql(50);
    expect(reportResultsStub.args[0][0][0].documents).to.be.eql(100);
    expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.eql(100);

    expect(reportResultsStub.args[0][0][99].action).to.be.eql(
      'Mock Documents Posting'
    );
    expect(reportResultsStub.args[0][0][99].lines).to.be.eql(500);
    expect(reportResultsStub.args[0][0][99].documents).to.be.eql(1000);
    expect(reportResultsStub.args[0][0][99].timer.getTime()).to.be.eql(100);
  });

  it('performFlow run throws a exception in second execution', async () => {
    // Given
    process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
    const dpTestTemplate: BulkDocumentProcessTestTemplate =
      await BulkDocumentProcess.build(
        MOCKPRODUCT_FULLNAME,
        100,
        100,
        1000,
        50,
        50,
        500,
        'Mock Documents Posting'
      );

    dpTestTemplate.dataCreation = stub().resolves();
    dpTestTemplate.dataDeletion = stub().resolves();

    dpTestTemplate.performFlow = stub()
      .onFirstCall()
      .resolves({
        getTime: stub().returns(100),
      })
      .onSecondCall()
      .rejects({ message: 'Test flow failed' });

    // When
    await BulkDocumentProcess.performTestFlow(dpTestTemplate);

    // Then
    expect(reportResultsStub.args[0][0].length).to.be.eql(2);

    expect(reportResultsStub.args[0][0][0].action).to.be.eql(
      'Mock Documents Posting'
    );
    expect(reportResultsStub.args[0][0][0].lines).to.be.eql(50);
    expect(reportResultsStub.args[0][0][0].documents).to.be.eql(100);
    expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.eql(100);

    expect(reportResultsStub.args[0][0][0].action).to.be.eql(
      'Mock Documents Posting'
    );
    expect(reportResultsStub.args[0][0][0].lines).to.be.eql(50);
    expect(reportResultsStub.args[0][0][0].documents).to.be.eql(100);
    expect(reportResultsStub.args[0][0][1].error).to.be.eql('Test flow failed');
  });
});
