/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */
import { expect } from 'chai';
import { restore, stub, SinonStub } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as orgContextService from '../../src/services/orgContext/orgContext';
import * as executionInfoService from '../../src/services/executionInfo';
import { BatchProcessTestTemplate, BatchProcess, ProcessStartResult } from '../../src/testTemplates/batchTestTemplate';
import { MOCKPRODUCT_FULLNAME } from '../../src/shared/constants';
import moment from 'moment';
import { delay } from '../../src/shared/uiHelper';
import * as utils from '../../src/services/salesforce/utils';
import * as salesforceConnectionHelper from '../../src/services/salesforce/connection';

chai.use(sinonChai);

describe('src/test-templates/batch-test-template', function() {
	this.timeout(0);

	let saveExecutionInfoStub: SinonStub;

	beforeEach(() => {
		saveExecutionInfoStub = stub(executionInfoService, 'saveExecutionInfo').resolves();
		stub(orgContextService, 'getOrgContext').resolves('testOrgContext');
	});

	afterEach(() => {
		restore();
	});

	let consoleStub: SinonStub;

	it('BatchProcess.build returns a BatchProcessTestTemplate instance with a connection ready to be used', async () => {
		// Given
		process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
		stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});

		// When
		const batchTestTemplate: BatchProcessTestTemplate = await BatchProcess.build(MOCKPRODUCT_FULLNAME, 10, 10, 'Mock Documents background Posting');

		// Then
		expect(batchTestTemplate.product).to.be.eq(MOCKPRODUCT_FULLNAME);
		expect(batchTestTemplate.action).to.be.eq('Mock Documents background Posting');
		expect(batchTestTemplate.nDocumentsInitial).to.be.eq(10);
		expect(batchTestTemplate.nLinesInitial).to.be.eq(10);
		expect(batchTestTemplate.connection).to.not.be.undefined;
	});

	it('Batch completes and save the result', async () => {
		// Given
		process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
		process.env.ASYNC_MONITOR_TIMEOUT = '1';
		const jobEndTime = moment();
		const jobStartingTime = moment(jobEndTime).subtract(10, 'seconds');

		stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});

		const query = stub(utils, 'query')
			.onFirstCall().resolves({
				records: [
					{
						Status: 'Processing',
						NumberOfErrors: 0
					}
				]
			})
			.onSecondCall().resolves({
				records: [
					{
						Status: 'Completed',
						NumberOfErrors: 0,
						CreatedDate: jobStartingTime.toDate(),
						CompletedDate: jobEndTime.toDate()
					}
				]
			});

		const batchTestTemplate: BatchProcessTestTemplate = await BatchProcess.build(MOCKPRODUCT_FULLNAME, 100, 50, 'Mock Documents Background Posting');

		batchTestTemplate.dataCreation = stub().resolves(true);
		batchTestTemplate.checkProcessCanBeLaunched = stub().resolves(true);
		batchTestTemplate.dataDeletion = stub().resolves();

		const startProcessMockResponse: ProcessStartResult = {apexJobId: 'apexJobId'};
		batchTestTemplate.startProcess = stub().resolves(startProcessMockResponse);
		consoleStub = stub(console, 'log');

		// When
		await BatchProcess.performTestFlow(batchTestTemplate);

		await delay(5000);

		consoleStub.restore();

		// Then
		expect(query.getCalls().length).to.be.eq(2);
		expect(query.getCalls()[0].args[1]).to.be.eq(`select status, CompletedDate, CreatedDate, NumberOfErrors, ExtendedStatus from AsyncApexJob WHERE id = 'apexJobId'`);
		expect(saveExecutionInfoStub.getCalls()[0].args[0][0].timer.getTime()).to.be.approximately(10000, 1);
		expect(saveExecutionInfoStub.getCalls()[0].args[0][0].error).to.be.eq('');
	});

	it('Batch fails/aborts and save the result as status is failed', async () => {
		// Given
		process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
		process.env.ASYNC_MONITOR_TIMEOUT = '1';
		const jobEndTime = moment();
		const jobStartingTime = moment(jobEndTime).subtract(10, 'seconds');

		stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});

		const query = stub(utils, 'query')
			.onFirstCall().resolves({
				records: [
					{
						Status: 'Processing',
						NumberOfErrors: 0
					}
				]
			})
			.onSecondCall().resolves({
				records: [
					{
						Status: 'Failed',
						CreatedDate: jobStartingTime.toDate(),
						CompletedDate: jobEndTime.toDate()
					}
				]
			});

		const batchTestTemplate: BatchProcessTestTemplate = await BatchProcess.build(MOCKPRODUCT_FULLNAME, 100, 50, 'Mock Documents Background Posting');

		batchTestTemplate.dataCreation = stub().resolves(true);
		batchTestTemplate.checkProcessCanBeLaunched = stub().resolves(true);
		batchTestTemplate.dataDeletion = stub().resolves();

		const startProcessMockResponse: ProcessStartResult = {apexJobId: 'apexJobId'};
		batchTestTemplate.startProcess = stub().resolves(startProcessMockResponse);

		consoleStub = stub(console, 'log');

		// When
		await BatchProcess.performTestFlow(batchTestTemplate);

		await delay(5000);

		consoleStub.restore();

		// Then
		expect(query.getCalls().length).to.be.eq(2);
		expect(query.getCalls()[0].args[1]).to.be.eq(`select status, CompletedDate, CreatedDate, NumberOfErrors, ExtendedStatus from AsyncApexJob WHERE id = 'apexJobId'`);
		expect(saveExecutionInfoStub.getCalls()[0].args[0][0].timer.getTime()).to.be.eq(-1);
		expect(saveExecutionInfoStub.getCalls()[0].args[0][0].error).to.be.eq('Job failed');
	});

	it('Batch fails/aborts and save the result as it has failed batches', async () => {
		// Given
		process.env.SF_BENCHMARK_CREDENTIALS = 'test1~test2';
		process.env.ASYNC_MONITOR_TIMEOUT = '1';

		stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});

		const query = stub(utils, 'query')
			.onFirstCall().resolves({
				records: [
					{
						Status: 'Processing',
						NumberOfErrors: 0
					}
				]
			})
			.onSecondCall().resolves({
				records: [
					{
						Status: 'Processing',
						NumberOfErrors: 1,
						ExtendedStatus: 'One record process failed'
					}
				]
			});

		const batchTestTemplate: BatchProcessTestTemplate = await BatchProcess.build(MOCKPRODUCT_FULLNAME, 100, 50, 'Mock Documents Background Posting');

		batchTestTemplate.dataCreation = stub().resolves(true);
		batchTestTemplate.checkProcessCanBeLaunched = stub().resolves(true);
		batchTestTemplate.dataDeletion = stub().resolves();

		const startProcessMockResponse: ProcessStartResult = {apexJobId: 'apexJobId'};
		batchTestTemplate.startProcess = stub().resolves(startProcessMockResponse);

		consoleStub = stub(console, 'log');

		// When
		await BatchProcess.performTestFlow(batchTestTemplate);

		await delay(5000);

		consoleStub.restore();

		// Then
		expect(query.getCalls().length).to.be.eq(2);
		expect(query.getCalls()[0].args[1]).to.be.eq(`select status, CompletedDate, CreatedDate, NumberOfErrors, ExtendedStatus from AsyncApexJob WHERE id = 'apexJobId'`);
		expect(saveExecutionInfoStub.getCalls()[0].args[0][0].timer.getTime()).to.be.eq(-1);
		expect(saveExecutionInfoStub.getCalls()[0].args[0][0].error).to.be.eq('One record process failed');
	});

	it('Data creation fails and will log it, no data is created', async () => {
		// Given
		stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});

		const batchTestTemplate: BatchProcessTestTemplate = await BatchProcess.build(MOCKPRODUCT_FULLNAME, 100, 50, 'Mock Documents Background Posting');

		const startProcessMockResponse: ProcessStartResult = {apexJobId: 'apexJobId'};
		const startProcess = stub().resolves(startProcessMockResponse);

		const dataDeletion = stub().resolves();

		batchTestTemplate.dataCreation = stub().resolves(false);
		batchTestTemplate.checkProcessCanBeLaunched = stub().resolves(true);
		batchTestTemplate.dataDeletion = dataDeletion;

		batchTestTemplate.startProcess = startProcess;

		consoleStub = stub(console, 'error');

		// When
		await BatchProcess.performTestFlow(batchTestTemplate);

		consoleStub.restore();

		const dataCreationFound = consoleStub.getCalls().some(callArgs => callArgs.args.includes(`Mock Documents Background Posting data was not created correctly, the test execution will not continue`));
		// Then
		expect(dataCreationFound).to.be.true;
		expect(startProcess.getCalls().length).to.be.eq(0);
		expect(saveExecutionInfoStub.getCalls().length).to.be.eq(0);
	});
});
