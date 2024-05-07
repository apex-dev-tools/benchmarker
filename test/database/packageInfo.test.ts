/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import { stub, SinonStub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { PackageInfoI } from '../../src/services/packageInfo/packageInfo';
import { packageInfoModel } from '../../src/database/packageInfo';
import { PackageInfo } from '../../src/database/entity/package';
import * as env from '../../src/shared/env';
import { savePackageInfo, getPackagesByVersionId } from '../../src/database/packageInfo';

chai.use(sinonChai);

describe('src/database/packageInfo', async () => {

	afterEach(() => {
		restore();
	});

	describe('save', () => {
		let connection: {
			manager: {
				save: SinonStub
			}
		};

		let getConnection: SinonStub;

		beforeEach(() => {
			getConnection = stub(db, 'getConnection');
		});

		const packageInfo: PackageInfoI = {
			packageName: 'TestPackage',
			packageVersion: '1.1.1',
			packageId: 'packageId',
			packageVersionId: 'packageVersionId',
			isBeta: false,
			betaName: 0
		};

		it('call save method', async () => {
			// Given
			connection = { manager: { save: stub().resolves(123) } };
			getConnection.resolves(connection);

			// When
			const {packageVersion, packageName, packageVersionId, packageId} = packageInfo;
			const packageInfoItem = await packageInfoModel.save(packageVersion, packageName, packageVersionId, packageId, false, 0);

			expect(getConnection).to.have.been.calledOnce;
			expect(connection.manager.save).to.have.been.calledOnce;
			expect(packageInfoItem).to.be.equal(123);
		});

	});

	describe('getPackagesBySubscriberVersionId', () => {
		let connection: {
			getRepository?: () => {
				createQueryBuilder: () => {
					getMany: () => {},
					where: () => {}
				}
			}
		};

		let getConnection: SinonStub;

		beforeEach(() => {
			getConnection = stub(db, 'getConnection');
		});

		it('returns empty for undefined package list', async () => {
			// Given
			// When
			const packageInfos = await packageInfoModel.getPackagesBySubscriberVersionId(undefined as unknown as string[]);

			// Then
			expect(packageInfos).to.eql([]);
		});

		it('returns empty for no packages', async () => {
			// Given
			// When
			const packageInfos = await packageInfoModel.getPackagesBySubscriberVersionId([]);

			// Then
			expect(packageInfos).to.eql([]);
		});

		it('call getPackagesBySubscriberVersionId method', async () => {
			// Given
			const package1 = new PackageInfo('name1', '1', 'id11', 'id22', false, 0 );
			const package2 = new PackageInfo('nam2', '2', 'id21', 'id22', true, 1);

			connection = {
				getRepository : stub().returns({
					createQueryBuilder: stub().returns({
						where: stub().returnsThis(),
						getMany: stub().returns([ package1, package2])
					})
				})
			};
			getConnection.resolves(connection);

			// When
			const packageInfos = await packageInfoModel.getPackagesBySubscriberVersionId(['id11', 'id22']);

			expect(getConnection).to.have.been.calledOnce;
			expect(packageInfos).to.be.deep.equal([ package1, package2]);
		});

	});
});

describe('src/database/packageInfo', () => {

	let getDatabaseUrl: SinonStub;
	let stubSave: SinonStub;

	beforeEach(() => {
		getDatabaseUrl = stub(env, 'getDatabaseUrl');
	});

	afterEach(() => {
		restore();
	});

	describe('savePackageInfo', () => {

		it('savePackageInfo should save data in database', async () => {
			// Given
			stubSave = stub(packageInfoModel, 'save');
			getDatabaseUrl.returns('test');

			// When
			await savePackageInfo('testPackageVersion', 'testPackageName', 'testPackageVersionId', 'testPackageId', false, 1);

			// Then
			expect(stubSave).to.have.been.called;
		});

		it('savePackageInfo should no save data in database', async () => {
			// Given
			getDatabaseUrl.returns('');
			stubSave = stub(packageInfoModel, 'save');

			// When
			const result = await savePackageInfo('testPackageVersion', 'testPackageName', 'testPackageVersionId', 'testPackageId', false, 1);

			// Then
			expect(stubSave).to.not.have.been.called;
			expect(result.betaName).to.be.equal(0);
			expect(result.isBeta).to.be.equal(false);
			expect(result.packageId).to.be.equal('');
			expect(result.packageName).to.be.equal('');
			expect(result.packageVersion).to.be.equal('');
			expect(result.packageVersionId).to.be.equal('');
		});
	});

	describe('getPackagesByVersionId', () => {

		it('getPackagesByVersionId should retrieve org info id from database', async () => {
			// Given
			stubSave = stub(packageInfoModel, 'getPackagesBySubscriberVersionId');
			getDatabaseUrl.returns('test');
			// When
			await getPackagesByVersionId(['testPackageVersionId']);

			// Then
			expect(stubSave).to.have.been.called;
		});

		it('getPackagesByVersionId should no retrieve org info id from database', async () => {
			// Given
			getDatabaseUrl.returns('');
			stubSave = stub(packageInfoModel, 'getPackagesBySubscriberVersionId');

			// When
			const result = await getPackagesByVersionId(['testPackageVersionId']);

			// Then
			expect(stubSave).to.not.have.been.called;
			expect(result[0].betaName).to.be.equal(0);
			expect(result[0].isBeta).to.be.equal(false);
			expect(result[0].packageId).to.be.equal('');
			expect(result[0].packageName).to.be.equal('');
			expect(result[0].packageVersion).to.be.equal('');
			expect(result[0].packageVersionId).to.be.equal('');
		});
	});
});
