/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { stub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as orgContextIndex from '../../../src/services/orgContext/orgContext';
import * as orgContextHelper from '../../../src/services/orgContext/helper';
import * as packageInfoService from '../../../src/services/packageInfo/packageInfo';
import * as salesforceConnectionHelper from '../../../src/services/salesforce/connection';
import { PackageInfoI } from '../../../src/services/packageInfo/packageInfo';
import { orgInfoModel } from '../../../src/database/orgInfo';
import { OrgInfo } from '../../../src/database/entity/org';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('src/services/org-context/index', () => {

	describe('getOrgContext', async () => {

		afterEach(() => {
			restore();
		});

		it('return org context containing org info and packages info', async () => {
			// Given
			stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});
			stub(orgContextHelper, 'getUserInfoData').resolves({isMulticurrency: true});
			stub(orgContextHelper, 'getOrganizationData').resolves({
				orgID: '1',
				orgInstance: 'TestInstance',
				isSandbox: true,
				isTrial: true,
				orgType: 'test'
			});
			stub(orgContextHelper, 'getIsLex').resolves(true);
			stub(orgContextHelper, 'getReleaseData').resolves({
				releaseVersion: 'Spring Test 2019',
				apiVersion: '45'
			});

			const packagesInfoMock = [
					{
						packageVersion: '1.1.1',
						packageName: 'Test Package',
						packageVersionId: '03t',
						packageId: '04t'
					}
				] as PackageInfoI[];
			stub(orgContextHelper, 'getPackagesInfo').resolves(packagesInfoMock);
			stub(packageInfoService, 'getPackageInfoByPackageVersionId').resolves(	[
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: '03t',
					packageId: '04t'
				}
			]);

			stub(orgInfoModel, 'getOrgInfoByOrgId').resolves(undefined);

			// When
			const orgContext: orgContextIndex.OrgContext = await orgContextIndex.getOrgContext({} as salesforceConnectionHelper.SalesforceConnection);

			// Then
			const expectedOrgInfo: orgContextIndex.OrgInfoI = {
				orgID: '1',
				releaseVersion: 'Spring Test 2019',
				apiVersion: '45',
				orgType: 'test',
				orgInstance: 'TestInstance',
				isSandbox: true,
				isTrial: true,
				isMulticurrency: true,
				isLex: true
			};

			expect(orgContext.orgInfo).to.deep.equal(expectedOrgInfo);
			expect(orgContext.packagesInfo).to.deep.equal(packagesInfoMock);
		});
	});

	describe('createNewOrgInfo', async () => {

		afterEach(() => {
			restore();
		});

		it('creates a new org info as that does not exists yet in DB', async () => {
			// Given
			process.env.DATABASE_URL = 'test';

			const orgInfoDBMock = {
				id: 1,
				orgID: '1',
				releaseVersion: 'Spring Test 2019',
				apiVersion: '45',
				orgType: 'test',
				orgInstance: 'TestInstance',
				isSandbox: true,
				isTrial: true,
				isMulticurrency: true,
				isLex: true
			};

			stub(orgInfoModel, 'getOrgInfoByOrgId').resolves(undefined);

			stub(orgInfoModel, 'save').resolves(orgInfoDBMock);
			// When
			const orgInfoToSave: orgContextIndex.OrgInfoI = {
				orgID: '1',
				releaseVersion: 'Spring Test 2019',
				apiVersion: '45',
				orgType: 'test',
				orgInstance: 'TestInstance',
				isSandbox: true,
				isTrial: true,
				isMulticurrency: true,
				isLex: true
			};

			const orgInfoDB: OrgInfo = await orgContextIndex.createNewOrgInfo(orgInfoToSave)

			// Then
			expect(orgInfoDB).to.deep.equal(orgInfoDBMock);
		});

		it('does not creates a new org info as that already exists in DB', async () => {
			// Given
			stub(salesforceConnectionHelper, 'connectToSalesforceOrg').resolves({});
			stub(orgContextHelper, 'getUserInfoData').resolves({isMulticurrency: true});
			stub(orgContextHelper, 'getOrganizationData').resolves({});
			const orgInfoDBMock = {
				id: 1,
				orgID: '1',
				releaseVersion: 'Spring Test 2019',
				apiVersion: '45',
				orgType: 'test',
				orgInstance: 'TestInstance',
				isSandbox: true,
				isTrial: true,
				isMulticurrency: true,
				isLex: true
			};

			stub(orgInfoModel, 'getOrgInfoByOrgId').resolves(orgInfoDBMock);

			const stubSave = stub(orgInfoModel, 'save');
			// When
			const orgInfoToSave: orgContextIndex.OrgInfoI = {
				orgID: '1',
				releaseVersion: 'Spring Test 2019',
				apiVersion: '45',
				orgType: 'test',
				orgInstance: 'TestInstance',
				isSandbox: true,
				isTrial: true,
				isMulticurrency: true,
				isLex: true
			};

			const orgInfoDB: OrgInfo = await orgContextIndex.createNewOrgInfo(orgInfoToSave);

			// Then
			expect(orgInfoDB).to.deep.equal(orgInfoDBMock);
			expect(stubSave).to.have.not.been.called;
		});
	});
});
