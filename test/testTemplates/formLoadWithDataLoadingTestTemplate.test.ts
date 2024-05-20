/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { restore, stub, SinonStub } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as salesforceConnectionHelper from '../../src/services/salesforce/connection';
import * as orgService from '../../src/services/org';
import * as resultService from '../../src/services/result';
import {
  FormLoadWithDataLoading,
  FormLoadWithDataLoadingTestTemplate,
} from '../../src/testTemplates/formLoadWithDataLoadingTestTemplate';
import {
  DEFAULT_NUMERIC_VALUE,
  MOCKPRODUCT_FULLNAME,
} from '../../src/shared/constants';
import * as context from '../../src/services/org/context';
import * as puppeteer from 'puppeteer';
import { Browser, Page, BrowserContext } from 'puppeteer';

chai.use(sinonChai);

describe('src/testTemplates/formLoadWithDataLoadingTestTemplate', () => {
  let reportResultsStub: SinonStub;

  beforeEach(() => {
    reportResultsStub = stub(resultService, 'reportResults').resolves();
    stub(orgService, 'getOrgContext').resolves(
      'testOrgContext' as unknown as context.OrgContext
    );
    stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({
      accessToken: 'token',
    } as salesforceConnectionHelper.SalesforceConnection);
    stub(context, 'getIsLex').resolves(true);

    const page = { setViewport: stub().resolves() } as unknown as Page;
    const browserContext = {
      newPage: stub().resolves(page),
    } as unknown as BrowserContext;
    const browserInstance = {
      createBrowserContext: stub().resolves(browserContext),
      browserContexts: stub().returns([browserContext]),
      close: stub().resolves(),
    } as unknown as Browser;
    stub(puppeteer, 'launch').resolves(browserInstance);
  });

  afterEach(() => {
    restore();
  });

  it('FormLoadWithDataLoading.build returns a FormLoadWithDataLoadingTestTemplate instance with a connection ready to be used', async () => {
    // When
    const fldlTestTemplate: FormLoadWithDataLoadingTestTemplate =
      await FormLoadWithDataLoading.build(
        MOCKPRODUCT_FULLNAME,
        10,
        20,
        200,
        'Mock Form Load with Data Loading'
      );

    // Then
    expect(fldlTestTemplate.product).to.be.eq(MOCKPRODUCT_FULLNAME);
    expect(fldlTestTemplate.action).to.be.eq(
      'Mock Form Load with Data Loading'
    );
    expect(fldlTestTemplate.linesInitial).to.be.eq(10);
    expect(fldlTestTemplate.linesPerIteration).to.be.eq(20);
    expect(fldlTestTemplate.linesMaximum).to.be.eq(200);
    expect(fldlTestTemplate.connection).to.not.be.undefined;
    expect(fldlTestTemplate.page).to.not.be.undefined;
    expect(fldlTestTemplate.frontdoorUrl).to.not.be.undefined;
    expect(fldlTestTemplate.navigator).to.not.be.undefined;
    expect(fldlTestTemplate.browser).to.not.be.undefined;
  });

  it('performFlow run throws a exception when UI test fail', async () => {
    // Given
    const fldlTestTemplate: FormLoadWithDataLoadingTestTemplate =
      await FormLoadWithDataLoading.build(
        MOCKPRODUCT_FULLNAME,
        120,
        15,
        DEFAULT_NUMERIC_VALUE,
        'Mock Form Load with Data Loading'
      );

    fldlTestTemplate.dataCreation = stub().resolves();
    fldlTestTemplate.dataDeletion = stub().resolves();

    fldlTestTemplate.performFlow = stub()
      .onFirstCall()
      .rejects({ message: 'Test flow failed' });

    // When
    await FormLoadWithDataLoading.performTestFlow(fldlTestTemplate);

    // Then
    expect(reportResultsStub.args[0][0].length).to.be.eql(1);
    expect(reportResultsStub.args[0][0][0].action).to.be.eql(
      'Mock Form Load with Data Loading'
    );
    expect(reportResultsStub.args[0][0][0].lines).to.be.eql(120);
    expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.lessThan(0);
    expect(reportResultsStub.args[0][0][0].error).to.be.eql('Test flow failed');
  });

  it('performFlow run until it reachs maximum number of lines', async () => {
    // Given
    const dlpTestTemplate: FormLoadWithDataLoadingTestTemplate =
      await FormLoadWithDataLoading.build(
        MOCKPRODUCT_FULLNAME,
        10,
        10,
        50,
        'Mock Form Load with Data Loading'
      );

    dlpTestTemplate.dataCreation = stub().resolves();
    dlpTestTemplate.dataDeletion = stub().resolves();

    dlpTestTemplate.performFlow = stub()
      .resolves({
        getTime: stub().returns(150),
        getDescription: stub().returns('test1:test1'),
      })
      .onFirstCall()
      .resolves({
        getTime: stub().returns(100),
        getDescription: stub().returns('test2:test2'),
      })
      .onSecondCall()
      .resolves({
        getTime: stub().returns(120),
        getDescription: stub().returns('test3:test3'),
      });

    // When
    await FormLoadWithDataLoading.performTestFlow(dlpTestTemplate);

    // Then
    expect(reportResultsStub.args[0][0].length).to.be.eql(5);

    expect(reportResultsStub.args[0][0][0].action).to.be.eql(
      'Mock Form Load with Data Loading'
    );
    expect(reportResultsStub.args[0][0][0].lines).to.be.eql(10);
    expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.eql(100);

    expect(reportResultsStub.args[0][0][1].action).to.be.eql(
      'Mock Form Load with Data Loading'
    );
    expect(reportResultsStub.args[0][0][1].lines).to.be.eql(20);
    expect(reportResultsStub.args[0][0][1].timer.getTime()).to.be.eql(120);

    expect(reportResultsStub.args[0][0][4].action).to.be.eql(
      'Mock Form Load with Data Loading'
    );
    expect(reportResultsStub.args[0][0][4].lines).to.be.eql(50);
    expect(reportResultsStub.args[0][0][4].timer.getTime()).to.be.eql(150);
  });

  it('performFlow run until receive timer with -1 duration (flow reached maximum lines)', async () => {
    // Given
    const dlpTestTemplate: FormLoadWithDataLoadingTestTemplate =
      await FormLoadWithDataLoading.build(
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
      getDescription: stub().returns('test2:test2'),
    });

    // When
    await FormLoadWithDataLoading.performTestFlow(dlpTestTemplate);

    // Then
    expect(reportResultsStub.getCalls()[0].lastArg).to.be.eq('testOrgContext');
  });
});
