/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { SinonStub, stub, restore } from 'sinon';
import * as orgContextService from '../../src/services/orgContext/orgContext';
import * as executionInfoService from '../../src/services/executionInfo';
import { expect } from 'chai';
import { TransactionTestTemplate } from '../../src/testTemplates/transactionTestTemplate';
import { saveResults } from '../../src/testTemplates/saveResult';

describe('src/test-templates/save-result', () => {

	let saveExecutionInfoStub: SinonStub;

	beforeEach(() => {
		saveExecutionInfoStub = stub(executionInfoService, 'saveExecutionInfo').resolves();
		stub(orgContextService, 'getOrgContext').resolves('testOrgContext');
	});

	describe('saveResults', () => {

		it('saves the passed results', async () => {
			const testTemplateStub = {} as TransactionTestTemplate;

			await saveResults(testTemplateStub, [
				{
					testStepDescription: {
						action: 'Mock action',
						flowName: 'Mock flow name'
					},
					result: {
						timer: 10,
						cpuTime: 5,
						dmlRows: 5,
						dmlStatements: 3,
						heapSize: 6,
						queryRows: 6,
						soqlQueries: 8
					}
				}
			]);

			expect(saveExecutionInfoStub.args[0][0][0].action).to.be.eql('Mock action');
			expect(saveExecutionInfoStub.args[0][0][0].flowName).to.be.eql('Mock flow name');
			expect(saveExecutionInfoStub.args[0][0].length).to.be.eql(1);
			expect(saveExecutionInfoStub.args[0][0][0].timer.getTime()).to.be.greaterThan(9);
			expect(saveExecutionInfoStub.args[0][0][0].cpuTime).to.be.equal(5);
			expect(saveExecutionInfoStub.args[0][0][0].dmlRows).to.be.equal(5);
			expect(saveExecutionInfoStub.args[0][0][0].dmlStatements).to.be.equal(3);
			expect(saveExecutionInfoStub.args[0][0][0].heapSize).to.be.equal(6);
			expect(saveExecutionInfoStub.args[0][0][0].queryRows).to.be.equal(6);
			expect(saveExecutionInfoStub.args[0][0][0].soqlQueries).to.be.equal(8);
		});

		it('saves results with error', async () => {
			const testTemplateStub = {} as TransactionTestTemplate;

			await saveResults(testTemplateStub, [
				{
					testStepDescription: {
						action: 'Mock action',
						flowName: 'Mock flow name'
					},
					result: {
						timer: 10,
						cpuTime: 5,
						dmlRows: 5,
						dmlStatements: 3,
						heapSize: 6,
						queryRows: 6,
						soqlQueries: 8
					},
					error: 'Exception processing flow'
				}
			]);

			expect(saveExecutionInfoStub.args[0][0][0].action).to.be.eql('Mock action');
			expect(saveExecutionInfoStub.args[0][0][0].flowName).to.be.eql('Mock flow name');
			expect(saveExecutionInfoStub.args[0][0].length).to.be.eql(1);
			expect(saveExecutionInfoStub.args[0][0][0].timer.getTime()).to.be.greaterThan(9);
			expect(saveExecutionInfoStub.args[0][0][0].cpuTime).to.be.equal(5);
			expect(saveExecutionInfoStub.args[0][0][0].dmlRows).to.be.equal(5);
			expect(saveExecutionInfoStub.args[0][0][0].dmlStatements).to.be.equal(3);
			expect(saveExecutionInfoStub.args[0][0][0].heapSize).to.be.equal(6);
			expect(saveExecutionInfoStub.args[0][0][0].queryRows).to.be.equal(6);
			expect(saveExecutionInfoStub.args[0][0][0].soqlQueries).to.be.equal(8);
			expect(saveExecutionInfoStub.args[0][0][0].error).to.be.equal('Exception processing flow');
		});
	});

	afterEach(() => {
		restore();
	});

});
