/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { restore, stub, SinonStub } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as salesforceConnectionHelper from '../../src/services/salesforce/connection';
import * as orgContextService from '../../src/services/orgContext/orgContext';
import * as executionInfoService from '../../src/services/executionInfo';
import { FormLoadWithDataLoading, FormLoadWithDataLoadingTestTemplate } from '../../src/testTemplates/formLoadWithDataLoadingTestTemplate';
import { DEFAULT_NUMERIC_VALUE, MOCKPRODUCT_FULLNAME } from '../../src/shared/constants';
import * as authHelper from '../../src/services/orgContext/helper';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { Substitute } from '@fluffy-spoon/substitute';

chai.use(sinonChai);

describe('src/test-templates/form-load-with-data-loading-test-template', () => {

	let saveExecutionInfoStub: SinonStub;

	beforeEach(() => {
		saveExecutionInfoStub = stub(executionInfoService, 'saveExecutionInfo').resolves();
		stub(orgContextService, 'getOrgContext').resolves('testOrgContext');
		stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});
		stub(authHelper, 'getIsLex').returns(true);
		const browserInstance = Substitute.for<Browser>();
		stub(puppeteer, 'launch').resolves(browserInstance);
	});

	afterEach(() => {
		restore();
	});

	it('FormLoadWithDataLoading.build returns a FormLoadWithDataLoadingTestTemplate instance with a connection ready to be used', async () =>{
		// When
		const fldlTestTemplate: FormLoadWithDataLoadingTestTemplate = await FormLoadWithDataLoading.build(MOCKPRODUCT_FULLNAME, 10, 20,  200, 'Mock Form Load with Data Loading');

		// Then
		expect(fldlTestTemplate.product).to.be.eq(MOCKPRODUCT_FULLNAME);
		expect(fldlTestTemplate.action).to.be.eq('Mock Form Load with Data Loading');
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
		const fldlTestTemplate: FormLoadWithDataLoadingTestTemplate = await FormLoadWithDataLoading.build(MOCKPRODUCT_FULLNAME, 120, 15,  DEFAULT_NUMERIC_VALUE, 'Mock Form Load with Data Loading');

		fldlTestTemplate.dataCreation = stub().resolves();
		fldlTestTemplate.dataDeletion = stub().resolves();

		fldlTestTemplate.performFlow = stub()
		.onFirstCall().rejects({message: 'Test flow failed'});

		// When
		await FormLoadWithDataLoading.performTestFlow(fldlTestTemplate);

		// Then
		expect(saveExecutionInfoStub.args[0][0].length).to.be.eql(1);
		expect(saveExecutionInfoStub.args[0][0][0].action).to.be.eql('Mock Form Load with Data Loading');
		expect(saveExecutionInfoStub.args[0][0][0].lines).to.be.eql(120);
		expect(saveExecutionInfoStub.args[0][0][0].timer.getTime()).to.be.lessThan(0);
		expect(saveExecutionInfoStub.args[0][0][0].error).to.be.eql('Test flow failed');
	});

	it('performFlow run until it reachs maximum number of lines', async () => {
		// Given
		const dlpTestTemplate: FormLoadWithDataLoadingTestTemplate = await FormLoadWithDataLoading.build(MOCKPRODUCT_FULLNAME, 10, 10,  50, 'Mock Form Load with Data Loading');

		dlpTestTemplate.dataCreation = stub().resolves();
		dlpTestTemplate.dataDeletion = stub().resolves();

		dlpTestTemplate.performFlow = stub()
		.resolves({
			getTime: stub().returns(150),
			getDescription: stub().returns('test1:test1')
		})
		.onFirstCall().resolves({
			getTime: stub().returns(100),
			getDescription: stub().returns('test2:test2')
		}).onSecondCall().resolves({
			getTime: stub().returns(120),
			getDescription: stub().returns('test3:test3')
		});

		// When
		await FormLoadWithDataLoading.performTestFlow(dlpTestTemplate);

		// Then
		expect(saveExecutionInfoStub.args[0][0].length).to.be.eql(5);

		expect(saveExecutionInfoStub.args[0][0][0].action).to.be.eql('Mock Form Load with Data Loading');
		expect(saveExecutionInfoStub.args[0][0][0].lines).to.be.eql(10);
		expect(saveExecutionInfoStub.args[0][0][0].timer.getTime()).to.be.eql(100);

		expect(saveExecutionInfoStub.args[0][0][1].action).to.be.eql('Mock Form Load with Data Loading');
		expect(saveExecutionInfoStub.args[0][0][1].lines).to.be.eql(20);
		expect(saveExecutionInfoStub.args[0][0][1].timer.getTime()).to.be.eql(120);

		expect(saveExecutionInfoStub.args[0][0][4].action).to.be.eql('Mock Form Load with Data Loading');
		expect(saveExecutionInfoStub.args[0][0][4].lines).to.be.eql(50);
		expect(saveExecutionInfoStub.args[0][0][4].timer.getTime()).to.be.eql(150);
	});

	it('performFlow run until receive timer with -1 duration (flow reached maximum lines)', async () => {
		// Given
		const dlpTestTemplate: FormLoadWithDataLoadingTestTemplate = await FormLoadWithDataLoading.build(MOCKPRODUCT_FULLNAME, 50, 50,  200, 'Mock Lines Posting');

		dlpTestTemplate.dataCreation = stub().resolves();
		dlpTestTemplate.dataDeletion = stub().resolves();

		dlpTestTemplate.performFlow = stub().resolves({
			getTime: stub().returns(100),
			getDescription: stub().returns('test2:test2')
		});

		// When
		await FormLoadWithDataLoading.performTestFlow(dlpTestTemplate);

		// Then
		expect(saveExecutionInfoStub.getCalls()[0].lastArg).to.be.eq('testOrgContext');
	});
});
