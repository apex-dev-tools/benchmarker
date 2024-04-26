/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import { createTables } from '../../../src/database/testResult/table';
import { TestResult } from '../../../src/database/entity/result';
import { restore } from 'sinon';

chai.use(sinonChai);

describe('src/database/testResult/table', () => {

	afterEach('', () => {
		restore();
	});

	describe('printTable', () => {

		it('should print table with dlpLines and dpDocuments', async () => {
			// Given
			const testResult: TestResult = new TestResult();
			testResult.duration = 10;
			testResult.action = 'FakeAction';
			testResult.flowName = 'FakeFlow';
			testResult.error = '';
			testResult.dlpLines = 10;
			testResult.dpDocuments = 1;
			testResult.cpuTime = 1;
			testResult.dmlRows = 1;
			testResult.dmlStatements = 1;
			testResult.heapSize = 1;
			testResult.queryRows = 1;
			testResult.soqlQueries = 1;

			const testResult2: TestResult = new TestResult();
			testResult2.duration = -1;
			testResult2.action = 'FakeAction2';
			testResult2.flowName = 'FakeFlow2';
			testResult2.error = 'FakeError2';
			testResult2.dlpLines = 10;
			testResult2.dpDocuments = 1;

			const testResult3: TestResult = new TestResult();
			testResult3.duration = -1;
			testResult3.action = 'FakeAction3';
			testResult3.flowName = 'FakeFlow3';
			testResult3.error = '';
			testResult3.dlpLines = 10;
			testResult3.dpDocuments = 1;

			const testStepResults: TestResult[] = [testResult, testResult2, testResult3];

			// When
			const { standard, governorLimits, errors } = createTables(testStepResults);

			// Then
			expect(standard).to.not.be.empty;
			expect(standard).contain('Flow Name');
			expect(standard).contain('Action');
			expect(standard).contain('Duration (ms)');
			expect(standard).contain('Number of Lines');
			expect(standard).contain('Number of Documents');

			expect(errors).to.not.be.empty;
			expect(errors).contain('Flow Name');
			expect(errors).contain('Action');
			expect(errors).contain('Error Message');
			expect(errors).contain('Number of Lines');
			expect(errors).contain('Number of Documents');

			expect(governorLimits).to.not.be.empty;
			expect(governorLimits).contain('Flow Name');
			expect(governorLimits).contain('Action');
			expect(governorLimits).contain('Number of Lines');
			expect(governorLimits).contain('Number of Documents');
			expect(governorLimits).contain('CPU time (ms)');
			expect(governorLimits).contain('DML rows');
			expect(governorLimits).contain('DML statements');
			expect(governorLimits).contain('Heap size (bytes)');
			expect(governorLimits).contain('Query rows');
			expect(governorLimits).contain('SOQL queries');
		});

		it('should print only standard table', async () => {
			// Given
			const testResult: TestResult = new TestResult();
			testResult.duration = -1;
			testResult.action = 'FakeAction3';
			testResult.flowName = 'FakeFlow3';
			testResult.error = '';
			testResult.dlpLines = 10;
			testResult.dpDocuments = 1;

			const testStepResults: TestResult[] = [testResult];

			// When
			const { standard, governorLimits, errors } = createTables(testStepResults);

			// Then
			expect(standard).to.not.be.empty;
			expect(standard).contain('Flow Name');
			expect(standard).contain('Action');
			expect(standard).contain('Duration (ms)');
			expect(standard).contain('Number of Lines');
			expect(standard).contain('Number of Documents');

			expect(errors).to.be.empty;

			expect(governorLimits).to.be.empty;
		});

		it('should print only governor limits table', async () => {
			// Given
			const testResult: TestResult = new TestResult();
			testResult.duration = 10;
			testResult.action = 'FakeAction';
			testResult.flowName = 'FakeFlow';
			testResult.error = '';
			testResult.dlpLines = 10;
			testResult.dpDocuments = 1;
			testResult.cpuTime = 1;
			testResult.dmlRows = 1;
			testResult.dmlStatements = 1;
			testResult.heapSize = 1;
			testResult.queryRows = 1;
			testResult.soqlQueries = 1;

			const testStepResults: TestResult[] = [testResult];

			// When
			const { standard, governorLimits, errors } = createTables(testStepResults);

			// Then
			expect(standard).to.be.empty;

			expect(errors).to.be.empty;

			expect(governorLimits).to.not.be.empty;
			expect(governorLimits).contain('Flow Name');
			expect(governorLimits).contain('Action');
			expect(governorLimits).contain('Number of Lines');
			expect(governorLimits).contain('Number of Documents');
			expect(governorLimits).contain('CPU time (ms)');
			expect(governorLimits).contain('DML rows');
			expect(governorLimits).contain('DML statements');
			expect(governorLimits).contain('Heap size (bytes)');
			expect(governorLimits).contain('Query rows');
			expect(governorLimits).contain('SOQL queries');
		});

		it('should print only errors table', async () => {
			// Given
			const testResult: TestResult = new TestResult();
			testResult.duration = 10;
			testResult.action = 'FakeAction';
			testResult.flowName = 'FakeFlow';
			testResult.error = 'FakeError';
			testResult.dlpLines = 10;
			testResult.dpDocuments = 1;
			testResult.cpuTime = 1;
			testResult.dmlRows = 1;
			testResult.dmlStatements = 1;
			testResult.heapSize = 1;
			testResult.queryRows = 1;
			testResult.soqlQueries = 1;
			const testStepResults: TestResult[] = [testResult];

			// When
			const { standard, governorLimits, errors } = createTables(testStepResults);

			// Then
			expect(standard).to.be.empty;
			expect(governorLimits).to.be.empty;

			expect(errors).to.not.be.empty;
			expect(errors).contain('Flow Name');
			expect(errors).contain('Action');
			expect(errors).contain('Error Message');
			expect(errors).contain('Number of Lines');
			expect(errors).contain('Number of Documents');
		});

		it('should no print errors table', async () => {
			// Given
			const testResult: TestResult = new TestResult();
			testResult.duration = 10;
			testResult.action = 'FakeAction';
			testResult.flowName = 'FakeFlow';
			testResult.error = '';
			testResult.dlpLines = 10;
			testResult.dpDocuments = 1;
			testResult.cpuTime = 1;
			testResult.dmlRows = 1;
			testResult.dmlStatements = 1;
			testResult.heapSize = 1;
			testResult.queryRows = 1;
			testResult.soqlQueries = 1;

			const testResult2: TestResult = new TestResult();
			testResult2.duration = 10;
			testResult2.action = 'FakeAction2';
			testResult2.flowName = 'FakeFlow2';
			testResult2.error = '';
			testResult2.dlpLines = 10;
			testResult2.dpDocuments = 1;
			const testStepResults: TestResult[] = [testResult, testResult2];

			// When
			const { standard, governorLimits, errors } = createTables(testStepResults);

			// Then
			expect(standard).to.not.be.empty;
			expect(standard).contain('Flow Name');
			expect(standard).contain('Action');
			expect(standard).contain('Duration (ms)');
			expect(standard).contain('Number of Lines');
			expect(standard).contain('Number of Documents');

			expect(errors).to.be.empty;

			expect(governorLimits).to.not.be.empty;
			expect(governorLimits).contain('Flow Name');
			expect(governorLimits).contain('Action');
			expect(governorLimits).contain('Number of Lines');
			expect(governorLimits).contain('Number of Documents');
			expect(governorLimits).contain('CPU time (ms)');
			expect(governorLimits).contain('DML rows');
			expect(governorLimits).contain('DML statements');
			expect(governorLimits).contain('Heap size (bytes)');
			expect(governorLimits).contain('Query rows');
			expect(governorLimits).contain('SOQL queries');
		});

		it('should print table without dlpLines and dpDocuments', async () => {
			// Given
			const testResult: TestResult = new TestResult();
			testResult.duration = 10;
			testResult.action = 'FakeAction';
			testResult.flowName = 'FakeFlow';
			testResult.error = '';
			testResult.dlpLines = -1;
			testResult.dpDocuments = -1;
			testResult.cpuTime = 1;
			testResult.dmlRows = 1;
			testResult.dmlStatements = 1;
			testResult.heapSize = 1;
			testResult.queryRows = -1;
			testResult.soqlQueries = -1;
			const testResult2: TestResult = new TestResult();
			testResult2.duration = 10;
			testResult2.action = 'FakeAction2';
			testResult2.flowName = 'FakeFlow2';
			testResult2.error = 'FakeError2';
			testResult2.dlpLines = -1;
			testResult2.dpDocuments = -1;
			const testStepResults: TestResult[] = [testResult, testResult2];

			// When
			const { standard, governorLimits, errors } = createTables(testStepResults);

			// Then
			expect(standard).to.be.empty;

			expect(errors).to.not.be.empty;
			expect(errors).contain('Flow Name');
			expect(errors).contain('Action');
			expect(errors).contain('Error Message');
			expect(errors).not.contain('Number of Lines');
			expect(errors).not.contain('Number of Documents');

			expect(governorLimits).to.not.be.empty;
			expect(governorLimits).contain('Flow Name');
			expect(governorLimits).contain('Action');
			expect(governorLimits).contain('CPU time (ms)');
			expect(governorLimits).contain('DML rows');
			expect(governorLimits).contain('DML statements');
			expect(governorLimits).contain('Heap size (bytes)');
			expect(governorLimits).contain('Query rows');
			expect(governorLimits).contain('SOQL queries');
			expect(governorLimits).not.contain('Number of Lines');
			expect(governorLimits).not.contain('Number of Documents');
		});
	});
});
