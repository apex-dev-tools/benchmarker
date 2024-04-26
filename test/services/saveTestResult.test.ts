/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import { TestResultI, saveTestResults } from '../../src/services/saveTestResult';
import * as testResultManager from '../../src/database/testResult';

import { Timer } from '../../src/shared/timer';
import { DEFAULT_NUMERIC_VALUE, MOCKPRODUCT_FULLNAME, FORM_LOAD } from '../../src/shared/constants';

chai.use(sinonChai);

describe('src/services/save-test-result/index', () => {

	afterEach(() => {
		restore();
	});

	describe('saveTestResults', () => {
		let testResultModel: {
			saveList: SinonStub
		};

		const t1: Timer = new Timer('test');
		t1.start();
		t1.end();

		beforeEach(() => {
			testResultModel = {
				saveList: stub()
			};

			testResultModel.saveList.resolves();

			stub(testResultManager, 'testResultModel').value(testResultModel);
		});

		it('save test run and test steps', async () => {
			// Given
			const testResults: TestResultI[] = [];
			testResults.push({
				timer: t1,
				action: 'test action',
				flowName: 'test page',
				product: MOCKPRODUCT_FULLNAME,
				incognitoBrowser: false,
				lighthouseSpeedIndex: undefined,
				lighthouseTimeToInteractive: undefined,
				testType: FORM_LOAD,
				cpuTime: 123,
				dmlRows: 123,
				dmlStatements: 123,
				heapSize: 123,
				queryRows: 123,
				soqlQueries: 123
			});

			// When
			await saveTestResults(testResults);

			// Then
			expect(testResultModel.saveList).to.have.been.calledOnceWith([
				{
					id: 0,
					duration: t1.getTime(),
					error: '',
					action: 'test action',
					flowName: 'test page',
					targetValue: DEFAULT_NUMERIC_VALUE,
					product: MOCKPRODUCT_FULLNAME,
					incognitoBrowser: false,
					lighthouseSpeedIndex: DEFAULT_NUMERIC_VALUE,
					lighthouseTimeToInteractive: DEFAULT_NUMERIC_VALUE,
					dlpLines: DEFAULT_NUMERIC_VALUE,
					dpDocuments: DEFAULT_NUMERIC_VALUE,
					testType: FORM_LOAD,
					cpuTime: 123,
					dmlRows: 123,
					dmlStatements: 123,
					heapSize: 123,
					queryRows: 123,
					soqlQueries: 123
				}
			]);

		});

		it('save test run and test steps with error', async () => {
			// Given
			const testResults: TestResultI[] = [];
			testResults.push({
				timer: t1,
				action: 'test action',
				flowName: 'test page',
				error: 'test error',
				product: MOCKPRODUCT_FULLNAME,
				incognitoBrowser: false,
				lighthouseSpeedIndex: DEFAULT_NUMERIC_VALUE,
				lighthouseTimeToInteractive: DEFAULT_NUMERIC_VALUE,
				testType: FORM_LOAD
			});

			// When
			await saveTestResults(testResults);

			// Then
			expect(testResultModel.saveList).to.have.been.calledOnceWith([
				{
					id: 0,
					duration: t1.getTime(),
					error: 'test error',
					action: 'test action',
					flowName: 'test page',
					targetValue: DEFAULT_NUMERIC_VALUE,
					product: MOCKPRODUCT_FULLNAME,
					incognitoBrowser: false,
					lighthouseSpeedIndex: DEFAULT_NUMERIC_VALUE,
					lighthouseTimeToInteractive: DEFAULT_NUMERIC_VALUE,
					dlpLines: DEFAULT_NUMERIC_VALUE,
					dpDocuments: DEFAULT_NUMERIC_VALUE,
					testType: FORM_LOAD,
					cpuTime: DEFAULT_NUMERIC_VALUE,
					dmlRows: DEFAULT_NUMERIC_VALUE,
					dmlStatements: DEFAULT_NUMERIC_VALUE,
					heapSize: DEFAULT_NUMERIC_VALUE,
					queryRows: DEFAULT_NUMERIC_VALUE,
					soqlQueries: DEFAULT_NUMERIC_VALUE
				}
			]);

		});

		it('save test run and test steps with lighthouse metrics', async () => {
			// Given
			const testResults: TestResultI[] = [];
			testResults.push({
				timer: t1,
				action: 'test action',
				flowName: 'test page',
				product: MOCKPRODUCT_FULLNAME,
				incognitoBrowser: false,
				lighthouseSpeedIndex: 123,
				lighthouseTimeToInteractive: 123,
				testType: FORM_LOAD
			});

			// When
			await saveTestResults(testResults);

			// Then
			expect(testResultModel.saveList).to.have.been.calledOnceWith([
				{
					id: 0,
					duration: t1.getTime(),
					error: '',
					action: 'test action',
					flowName: 'test page',
					targetValue: DEFAULT_NUMERIC_VALUE,
					product: MOCKPRODUCT_FULLNAME,
					incognitoBrowser: false,
					lighthouseSpeedIndex: 123,
					lighthouseTimeToInteractive: 123,
					dlpLines: DEFAULT_NUMERIC_VALUE,
					dpDocuments: DEFAULT_NUMERIC_VALUE,
					testType: FORM_LOAD,
					cpuTime: DEFAULT_NUMERIC_VALUE,
					dmlRows: DEFAULT_NUMERIC_VALUE,
					dmlStatements: DEFAULT_NUMERIC_VALUE,
					heapSize: DEFAULT_NUMERIC_VALUE,
					queryRows: DEFAULT_NUMERIC_VALUE,
					soqlQueries: DEFAULT_NUMERIC_VALUE
				}
			]);

		});

	});
});
