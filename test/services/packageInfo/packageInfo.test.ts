/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { stub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as packageInfoManager from '../../../src/database/packageInfo';
import { getPackageInfoByPackageVersionId, createNewPackages } from '../../../src/services/packageInfo/packageInfo';
import * as helper from '../../../src/services/packageInfo/helper';
import { PackageInfo } from '../../../src/database/entity/package';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('src/services/package-info/index', () => {
	afterEach(() => {
		restore();
	});

	describe('getPackageInfoByPackageVersionId', () => {

		it('Returns package info by package version id', async () => {
			// Given
			const packageInfoModel = {
				getPackagesBySubscriberVersionId: stub()
			};

			stub(packageInfoManager, 'packageInfoModel').value(packageInfoModel);
			packageInfoModel.getPackagesBySubscriberVersionId
			.withArgs(['package version id 1', 'package version id 2'])
			.resolves([
				{
					packageName: 'package name 1',
					packageVersion: 'package version 1',
					packageVersionId: 'package version id 1',
					packageId: 'package id 1',
					isBeta: false,
					betaName: undefined,
				},
				{
					packageName: 'package name 2',
					packageVersion: 'package version 2',
					packageVersionId: 'package version id 2',
					packageId: 'package id 2',
					isBeta: true,
					betaName: 2
				}
			]);

			// Then
			const packagesInfo = await getPackageInfoByPackageVersionId([
				{
					packageName: 'package name 1',
					packageVersion: 'package version 1',
					packageVersionId: 'package version id 1',
					packageId: 'package id 1',
					isBeta: false,
					betaName: 0
				},
				{
					packageName: 'package name 2',
					packageVersion: 'package version 2',
					packageVersionId: 'package version id 2',
					packageId: 'package id 2',
					isBeta: true,
					betaName: 2
				}
			]);

			expect(packagesInfo[0].packageName).to.be.eq('package name 1');
			expect(packagesInfo[1].packageName).to.be.eq('package name 2');
		});
	});

	describe('createNewPackages', () => {

		it('Creates non duplicate packages', async () => {
			// Given
			stub(helper, 'getNonDuplicates').resolves([{
				packageVersion: '1.1.1',
				packageName: 'Test Package',
				packageVersionId: '03t',
				packageId: '04t'
			}]);

			const returnedPackageInfo = new PackageInfo('Test Package', '1.1.1', '03t', '04t', false, 0);

			const packageInfoModel = {
				save: stub().resolves(returnedPackageInfo)
			};

			stub(packageInfoManager, 'packageInfoModel').value(packageInfoModel);

			// When
			const packagesInfo = [
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: '03t',
					packageId: '04t',
					isBeta: false,
					betaName: 0
				},
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: '03t',
					packageId: '04t',
					isBeta: false,
					betaName: 0
				}
			];

			const result = await createNewPackages(packagesInfo);

			// Then
			expect(packageInfoModel.save).has.been.calledOnceWith(packagesInfo[0].packageVersion, packagesInfo[0].packageName, packagesInfo[0].packageVersionId, packagesInfo[0].packageId);
			expect(result).to.be.deep.equal([returnedPackageInfo]);
		});

	});
});
