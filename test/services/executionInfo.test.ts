/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { stub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as orgModelShapeManager from '../../src/database/executionInfo';
import { saveExecutionInfo } from '../../src/services/executionInfo';
import { PackageInfo } from '../../src/database/entity/package';
import { ExecutionInfo } from '../../src/database/entity/execution';
import { TestResult } from '../../src/database/entity/result';
import * as saveTestResult from '../../src/services/saveTestResult';
import * as packageInfoService from '../../src/services/packageInfo/packageInfo';
import * as orgContextService from '../../src/services/orgContext/orgContext';
import { OrgInfo } from '../../src/database/entity/org';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('src/services/execution-info/index', () => {
	afterEach(() => {
		restore();
	});

	describe('saveExecutionInfo', () => {

		it('saveExecutionInfo creates correct execution infos', async () => {
			// Given
			const testExternalBuildId = 'Test Pipeline 1 - Build #1';
			process.env.EXTERNAL_BUILD_ID = testExternalBuildId;
			process.env.DATABASE_URL = 'test';
			const bulkDBSaveExecutionInfoRowsStub = stub(orgModelShapeManager.executionInfoModel, 'bulkSave').resolves();

			const testResult1 = new TestResult();
			testResult1.id = 1;

			const testResult2 = new TestResult();
			testResult2.id = 2;

			const testResults: TestResult[] = [
				testResult1,
				testResult2
			];

			stub(saveTestResult, 'saveTestResults').resolves(testResults);

			stub(packageInfoService, 'createNewPackages').resolves();

			const package1 = new PackageInfo('Test Package', '1.1.1', '1', '1', false, 0);
			package1.id = 1;

			const package2 = new PackageInfo('Test Package', '1.1.1', '2', '3', true , 1);
			package2.id = 2;

			const packagesInfo: PackageInfo[] = [
				package1,
				package2
			];

			stub(packageInfoService, 'getPackageInfoByPackageVersionId').resolves(packagesInfo);

			const orgInfoDB = new OrgInfo();
			orgInfoDB.id = 0;

			stub(orgContextService, 'createNewOrgInfo').resolves(orgInfoDB);

			// When
			await saveExecutionInfo([] as saveTestResult.TestResultI[], {} as orgContextService.OrgContext);

			// Then
			const execInfo1: ExecutionInfo = new ExecutionInfo();
			execInfo1.id = 0;
			execInfo1.orgInfoId = 0;
			execInfo1.testResultId = 1;
			execInfo1.packageInfoId = 1;
			execInfo1.externalBuildId = testExternalBuildId;

			const execInfo2: ExecutionInfo = new ExecutionInfo();
			execInfo2.id = 0;
			execInfo2.orgInfoId = 0;
			execInfo2.testResultId = 1;
			execInfo2.packageInfoId = 2;
			execInfo2.externalBuildId = testExternalBuildId;

			const execInfo3: ExecutionInfo = new ExecutionInfo();
			execInfo3.id = 0;
			execInfo3.orgInfoId = 0;
			execInfo3.testResultId = 2;
			execInfo3.packageInfoId = 1;
			execInfo3.externalBuildId = testExternalBuildId;

			const execInfo4: ExecutionInfo = new ExecutionInfo();
			execInfo4.id = 0;
			execInfo4.orgInfoId = 0;
			execInfo4.testResultId = 2;
			execInfo4.packageInfoId = 2;
			execInfo4.externalBuildId = testExternalBuildId;

			expect(bulkDBSaveExecutionInfoRowsStub.args[0][0][0]).to.deep.equal(execInfo1);
			expect(bulkDBSaveExecutionInfoRowsStub.args[0][0][1]).to.deep.equal(execInfo2);
			expect(bulkDBSaveExecutionInfoRowsStub.args[0][0][2]).to.deep.equal(execInfo3);
			expect(bulkDBSaveExecutionInfoRowsStub.args[0][0][3]).to.deep.equal(execInfo4);
		});

		it('saveExecutionInfo creates execution infos without packages', async () => {
			// Given
			const testExternalBuildId = 'Test Pipeline 1 - Build #1';
			process.env.EXTERNAL_BUILD_ID = testExternalBuildId;
			process.env.DATABASE_URL = 'test';
			const bulkDBSaveExecutionInfoRowsStub = stub(orgModelShapeManager.executionInfoModel, 'bulkSave').resolves();

			const testResult1 = new TestResult();
			testResult1.id = 1;

			const testResults: TestResult[] = [
				testResult1
			];

			stub(saveTestResult, 'saveTestResults').resolves(testResults);

			stub(packageInfoService, 'createNewPackages').resolves();

			const packagesInfo: PackageInfo[] = [];

			stub(packageInfoService, 'getPackageInfoByPackageVersionId').resolves(packagesInfo);

			const orgInfoDB = new OrgInfo();
			orgInfoDB.id = 0;

			stub(orgContextService, 'createNewOrgInfo').resolves(orgInfoDB);

			// When
			await saveExecutionInfo([] as saveTestResult.TestResultI[], {} as orgContextService.OrgContext);

			// Then
			const execInfo1: ExecutionInfo = new ExecutionInfo();
			execInfo1.id = 0;
			execInfo1.orgInfoId = 0;
			execInfo1.testResultId = 1;
			execInfo1.packageInfoId = -1;
			execInfo1.externalBuildId = testExternalBuildId;

			expect(bulkDBSaveExecutionInfoRowsStub.args[0][0][0]).to.deep.equal(execInfo1);
		});

	});

});
