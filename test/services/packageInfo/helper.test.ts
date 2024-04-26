/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import { stub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as packageInfoManager from '../../../src/database/packageInfo';

import { getNonDuplicates } from '../../../src/services/packageInfo/helper';

chai.use(sinonChai);

describe('src/services/package-info/helper', () => {
	afterEach(() => {
		restore();
	});

	describe('getNonDuplicates',  () => {

		it('Returns only one new package', async () => {
			// Given
			const packagesInfo = [
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: 'package version id 1',
					packageId: '04t',
					isBeta: false,
					betaName: 0
				},
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: 'package version id 2',
					packageId: '04t',
					isBeta: true,
					betaName: 1
				}
			];

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
					betaName: 0
				}
			]);
			// When
			const result = await getNonDuplicates(packagesInfo);

			// Then
			expect(result).to.be.deep.equal([packagesInfo[1]]);
		});

		it('Returns all packages', async () => {
			// Given
			const packagesInfo = [
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: 'package version id 1',
					packageId: '04t',
					isBeta: false,
					betaName: 0
				},
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: 'package version id 2',
					packageId: '04t',
					isBeta: false,
					betaName: 0
				}
			];

			const packageInfoModel = {
				getPackagesBySubscriberVersionId: stub()
			};

			stub(packageInfoManager, 'packageInfoModel').value(packageInfoModel);
			packageInfoModel.getPackagesBySubscriberVersionId
			.withArgs(['package version id 1', 'package version id 2'])
			.resolves([]);
			// When
			const result = await getNonDuplicates(packagesInfo);

			// Then
			expect(result).to.be.deep.equal(packagesInfo);
		});

		it('Returns none as all packages exits', async () => {
			// Given
			const packagesInfo = [
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: 'package version id 1',
					packageId: '04t',
					isBeta: false,
					betaName: 0
				},
				{
					packageVersion: '1.1.1',
					packageName: 'Test Package',
					packageVersionId: 'package version id 2',
					packageId: '04t',
					isBeta: false,
					betaName: 0
				}
			];

			const packageInfoModel = {
				getPackagesBySubscriberVersionId: stub()
			};

			stub(packageInfoManager, 'packageInfoModel').value(packageInfoModel);
			packageInfoModel.getPackagesBySubscriberVersionId
			.withArgs(['package version id 1', 'package version id 2'])
			.resolves(packagesInfo);
			// When
			const result = await getNonDuplicates(packagesInfo);

			// Then
			expect(result).to.be.deep.equal([]);
		});

	});

});
