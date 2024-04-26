/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import { stub, SinonStub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { executionInfoModel } from '../../src/database/executionInfo';
import * as env from '../../src/shared/env';
import { bulkSaveExecutionInfo } from '../../src/database/executionInfo';
import { ExecutionInfo } from '../../src/database/entity/execution';

chai.use(sinonChai);

describe('src/database/executionInfo', () => {

	let getConnection: SinonStub;

	beforeEach(() => {
		getConnection = stub(db, 'getConnection');
	});

	afterEach(() => {
		restore();
	});

	describe('bulkSave', () => {

		it('call bulkSave method', async () => {
			// Given

			let connection: {
				manager: {
					save: SinonStub
				}
			};

			connection = { manager: { save: stub().resolves([
				{
					testResults: [],
					orgInfoId: {},
					packagesInfo: []
				},
				{
					testResults: [],
					orgInfoId: {},
					packagesInfo: []
				},
			]) } };

			getConnection.resolves(connection);

			// When
			const result = await executionInfoModel.bulkSave([]);

			// Then
			expect(result.length).to.be.eq(2);
		});
	});
});

describe('src/database/executionInfo', () => {

	let getDatabaseUrl: SinonStub;
	let stubSave: SinonStub;

	beforeEach(() => {
		getDatabaseUrl = stub(env, 'getDatabaseUrl');
		stubSave = stub(executionInfoModel, 'bulkSave');
	});

	afterEach(() => {
		restore();
	});

	describe('bulkSaveExecutionInfo', () => {

		it('bulkSaveExecutionInfo should save data in database', async () => {
			// Given
			getDatabaseUrl.returns('test');

			const executionInfo = new ExecutionInfo();
			executionInfo.packageInfoId = 1;
			executionInfo.orgInfoId = 2;
			executionInfo.testResultId = 3;

			// When
			await bulkSaveExecutionInfo([executionInfo]);

			// Then
			expect(stubSave).to.have.been.called;
		});

		it('bulkSaveExecutionInfo should no save data in database', async () => {
			// Given
			getDatabaseUrl.returns('');

			// When
			const result = await bulkSaveExecutionInfo([new ExecutionInfo()]);

			// Then
			expect(stubSave).to.not.have.been.called;
			expect(result[0].testResultId).to.be.equal(-1);
			expect(result[0].testResultId).to.be.equal(-1);
			expect(result[0].testResultId).to.be.equal(-1);
		});
	});
});
