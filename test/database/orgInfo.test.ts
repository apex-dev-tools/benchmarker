/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import { stub, SinonStub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { orgInfoModel } from '../../src/database/orgInfo';
import { OrgInfo } from '../../src/database/entity/org';
import { OrgInfoI } from '../../src/services/orgContext/orgContext';
import * as env from '../../src/shared/env';
import { saveOrgInfo, getOrgInfoById } from '../../src/database/orgInfo';

chai.use(sinonChai);

describe('src/database/orgInfo', async () => {

	afterEach(() => {
		restore();
	});

	let getConnection: SinonStub;

	beforeEach(() => {
		getConnection = stub(db, 'getConnection');
	});

	describe('save', () => {
		let connection: {
			manager: {
				save: SinonStub
			}
		};

		const orgInfo: OrgInfoI = {
			orgID: '0',
			releaseVersion: '0',
			apiVersion: '0',
			orgType: '0',
			orgInstance: '0',
			isSandbox: false,
			isTrial: false,
			isMulticurrency: false,
			isLex: false
		};

		it('call save method', async () => {
			// Given
			connection = { manager: { save: stub().resolves(123) } };
			getConnection.resolves(connection);

			// When
			const originalOrgShape: OrgInfo = new OrgInfo();
			originalOrgShape.fillOrgContextInformation(orgInfo);
			const executionInfo = await orgInfoModel.save(originalOrgShape);

			expect(getConnection).to.have.been.calledOnce;
			expect(connection.manager.save).to.have.been.calledOnce;
			expect(executionInfo).to.be.equal(123);
		});

	});

	describe('getOrgInfoByOrgId', () => {

		it('returns given row', async () => {
			// Given
			let connection: {
				getRepository?: () => {
					createQueryBuilder: () => {
						getOne: () => {},
						where: () => {},
						andWhere: () => {}
					}
				}
			};

			const createdOrgInfo: OrgInfo = new OrgInfo();
			createdOrgInfo.fillOrgContextInformation({
				orgID: '1',
				releaseVersion: 'Spring Test 2019',
				apiVersion: '45',
				orgType: 'test',
				orgInstance: 'TestInstance',
				isSandbox: true,
				isTrial: true,
				isMulticurrency: true,
				isLex: true,
			});

			const queryBuilder: {
				getOne: SinonStub,
				where: SinonStub,
				andWhere: SinonStub
			} = {
				getOne: stub().returns(createdOrgInfo),
				where: stub().returnsThis(),
				andWhere: stub().returnsThis()
			};

			connection = {
				getRepository : stub().returns({
					createQueryBuilder: stub().returns(queryBuilder)
				})
			};

			getConnection.resolves(connection);

			// When
			const orgInfoResult = await orgInfoModel.getOrgInfoByOrgId('id', '45');

			// Then
			expect(createdOrgInfo).to.be.deep.equal(orgInfoResult);

		});

	});
});

describe('src/database/orgInfo', () => {

	let getDatabaseUrl: SinonStub;
	let stubSave: SinonStub;

	beforeEach(() => {
		getDatabaseUrl = stub(env, 'getDatabaseUrl');
	});

	afterEach(() => {
		restore();
	});

	describe('saveOrgInfo', () => {

		it('saveOrgInfo should save data in database', async () => {
			// Given
			stubSave = stub(orgInfoModel, 'save');
			getDatabaseUrl.returns('test');

			const orgInfo = new OrgInfo();
			orgInfo.orgId = 'testId';
			orgInfo.releaseVersion = 'testVersion';
			orgInfo.apiVersion = 'testApiVersion';
			orgInfo.orgType = 'testOrgType';
			orgInfo.instance = 'testInstance';
			orgInfo.isLex = true;
			orgInfo.isMulticurrency = true;
			orgInfo.isSandbox = false;
			orgInfo.isTrial = false;

			// When
			await saveOrgInfo(orgInfo);

			// Then
			expect(stubSave).to.have.been.called;
		});

		it('saveOrgInfo should no save data in database', async () => {
			// Given
			getDatabaseUrl.returns('');
			stubSave = stub(orgInfoModel, 'save');

			// When
			const result = await saveOrgInfo(new OrgInfo());

			// Then
			expect(stubSave).to.not.have.been.called;
			expect(result.orgId).to.be.equal('');
			expect(result.releaseVersion).to.be.equal('');
			expect(result.apiVersion).to.be.equal('');
			expect(result.orgType).to.be.equal('');
			expect(result.instance).to.be.equal('');
			expect(result.isLex).to.be.equal(false);
			expect(result.isMulticurrency).to.be.equal(false);
			expect(result.isSandbox).to.be.equal(false);
			expect(result.isTrial).to.be.equal(false);
		});
	});

	describe('getOrgInfoById', () => {

		it('getOrgInfoById should retrieve org info id from database', async () => {
			// Given
			stubSave = stub(orgInfoModel, 'getOrgInfoByOrgId');
			getDatabaseUrl.returns('test');
			// When
			await getOrgInfoById('testOrgId', 'testApiVersion');

			// Then
			expect(stubSave).to.have.been.called;
		});

		it('getOrgInfoById should no retrieve org info id from database', async () => {
			// Given
			getDatabaseUrl.returns('');
			stubSave = stub(orgInfoModel, 'getOrgInfoByOrgId');

			// When
			const result = await getOrgInfoById('testOrgId', 'testApiVersion');

			// Then
			expect(stubSave).to.not.have.been.called;
			expect(result!.orgId).to.be.equal('');
			expect(result!.releaseVersion).to.be.equal('');
			expect(result!.apiVersion).to.be.equal('');
			expect(result!.orgType).to.be.equal('');
			expect(result!.instance).to.be.equal('');
			expect(result!.isLex).to.be.equal(false);
			expect(result!.isMulticurrency).to.be.equal(false);
			expect(result!.isSandbox).to.be.equal(false);
			expect(result!.isTrial).to.be.equal(false);
		});
	});
});
