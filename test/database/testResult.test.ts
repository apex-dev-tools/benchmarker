/*
* Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
*/

import { expect } from 'chai';
import * as chai from 'chai';
import { stub, SinonStub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { TestResult } from '../../src/database/entity/result';
import { testResultModel } from '../../src/database/testResult';
import * as env from '../../src/shared/env';
import { saveTestResult } from '../../src/database/testResult';

chai.use(sinonChai);

describe('src/database/testResult', () => {

	it('save method call to database and return object', async () => {
		// Given
		const testResult: TestResult = new TestResult();
		testResult.testRun = 1;
		testResult.duration = 999;

		const connection = { manager: { save: stub().resolves({...testResult, id: 123}) } };
		const getConnection = stub(db, 'getConnection').resolves(connection);

		const result = await testResultModel.save(testResult);

		expect(getConnection).to.have.been.calledOnce;
		expect(connection.manager.save).to.have.been.calledOnceWith(testResult);
		expect(result).to.include({...testResult, id: 123});
	});

	it('saveList method call to database and return object', async () => {
		// Given
		const testResult: TestResult = new TestResult();
		testResult.testRun = 1;
		testResult.duration = 999;

		const connection = { manager: { save: stub().resolves([{...testResult, id: 123}]) } };
		const getConnection = stub(db, 'getConnection').resolves(connection);

		const result = await testResultModel.saveList([testResult]);

		expect(getConnection).to.have.been.calledOnce;
		expect(connection.manager.save).to.have.been.calledOnceWith([testResult]);
		expect(result).to.deep.equal([{...testResult, id: 123}]);
	});

	afterEach(() => {
		restore();
	});
});

describe('src/database/testResult', () => {

	let getDatabaseUrl: SinonStub;
	let stubSave: SinonStub;

	beforeEach(() => {
		getDatabaseUrl = stub(env, 'getDatabaseUrl');
		stubSave = stub(testResultModel, 'saveList');
	});

	afterEach(() => {
		restore();
	});

	describe('saveTestResult', () => {

		it('saveTestResult should save data in database', async () => {
			// Given
			getDatabaseUrl.returns('test');

			// When
			const testResult: TestResult = new TestResult();
			testResult.duration = 10;
			testResult.action = 'FakeAction';
			testResult.flowName = 'FakeFlow';
			testResult.error = '';
			testResult.product = 'FakeProduct';
			testResult.dlpLines = 10;
			testResult.dpDocuments = 1;
			testResult.testType = 'FakeType';
			const testStepResults: TestResult[] = [testResult];
			await saveTestResult(testStepResults);

			// Then
			expect(stubSave).to.have.been.called;
		});

		it('saveTestResult should no save data in database', async () => {
			// Given
			getDatabaseUrl.returns('');

			// When
			const testResult: TestResult = new TestResult();
			testResult.duration = 10;
			testResult.action = 'FakeAction';
			testResult.flowName = 'FakeFlow';
			testResult.error = '';
			testResult.product = 'FakeProduct';
			testResult.dlpLines = 10;
			testResult.dpDocuments = 1;
			testResult.testType = 'FakeType';
			const testStepResults: TestResult[] = [testResult];
			const result = await saveTestResult(testStepResults);

			// Then
			expect(stubSave).to.not.have.been.called;
			expect(result[0].duration).to.be.equal(-1);
			expect(result[0].action).to.be.equal('');
			expect(result[0].flowName).to.be.equal('');
			expect(result[0].error).to.be.equal('');
			expect(result[0].product).to.be.equal('');
			expect(result[0].dlpLines).to.be.equal(-1);
			expect(result[0].dpDocuments).to.be.equal(-1);
			expect(result[0].testType).to.be.equal('');
		});
	});
});
