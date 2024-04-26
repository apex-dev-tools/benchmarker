/*
 * Copyright (c) 2019-2020 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SinonStub, stub, restore, spy } from 'sinon';
import sinonChai from 'sinon-chai';
import axios from 'axios';
import { DEFAULT_NUMERIC_VALUE } from '../../../src/shared/constants';
import * as utils from '../../../src/services/salesforce/utils';
import { PackageInfoI } from '../../../src/services/packageInfo/packageInfo';
import { SalesforceConnection } from '../../../src/services/salesforce/connection';

const ACCESS_TOKEN = 'example access token';
const INSTANCE_URL = 'https://ff01.salesforce.com';

const EXPECTED_LOGIN_URL = 'https://ff01.salesforce.com/secur/frontdoor.jsp?sid=example%20access%20token&retURL=home%2Fhome.jsp%3Fsource%3Dlex';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('src/services/org-context/helper', () => {
	let login: SinonStub;
	let orgContextHelper: any;

	beforeEach(() => {
		orgContextHelper = require('../../../src/services/orgContext/helper');

	});

	afterEach(() => {
		delete require.cache[require.resolve('../../../src/services/orgContext/helper')];
		restore();
	});

	describe('getLoginUrl', () => {

		it('should return frontdoor URL', async () => {

			// When
			const loginUrl = await orgContextHelper.getLoginUrl({instanceUrl: EXPECTED_LOGIN_URL, accessToken: ACCESS_TOKEN});

			// Then
			expect(loginUrl).to.contains(EXPECTED_LOGIN_URL);
		});
	});

	describe('getIsLex', async () => {

		afterEach(() => {
			restore();
		});

		it('should return true if user is in LEX', async () => {
			stub(utils, 'executeAnonymous').resolves({exceptionMessage: 'System.AssertException: Assertion Failed: -_true_-'});

			const isLex = await orgContextHelper.getIsLex({} as SalesforceConnection);

			expect(isLex).to.eql(true);
		});

		it('should return false if user is in classic', async () => {
			stub(utils, 'executeAnonymous').resolves({exceptionMessage: 'System.AssertException: Assertion Failed: -_false_-'});

			const isLex = await orgContextHelper.getIsLex({} as SalesforceConnection);

			expect(isLex).to.eql(false);
		});

		it('should not lazy load the value', async () => {
			stub(utils, 'executeAnonymous').resolves({exceptionMessage: 'System.AssertException: Assertion Failed: -_false_-'});

			let isLex = await orgContextHelper.getIsLex('ExampleUser', 'ExamplePassword');
			isLex = await orgContextHelper.getIsLex('ExampleUser', 'ExamplePassword');

			expect(isLex).to.eql(false);
		});
	});

	describe('getPackagesInfo', () => {
		let queryStub: SinonStub;
		let getStub: SinonStub;
	
		beforeEach(() => {
			const fakeResponse = {
				data: [
					{ label: 'TestSpring2019', version: '45' }
				]
			};
			getStub = stub(axios, 'get').resolves(fakeResponse);
			login = stub().yields({}, { id: '123' }).returns({});
		});
	
		afterEach(() => {
			restore();
		});
	
		it('should package info with patch version', async () => {
			const result = [
				{
					SubscriberPackage: {
						Name: 'Test',
						Id: 1234
					},
					SubscriberPackageVersion: {
						MajorVersion: 2019,
						MinorVersion: 200,
						PatchVersion: 1,
						Id: 121,
						IsBeta: false,
						BuildNumber: 2
					}
				}
			];
	
			queryStub = stub().yields(undefined, { records: result }).returns({});
	
			const connection = {
				accessToken: ACCESS_TOKEN,
				instanceUrl: INSTANCE_URL,
				login,
				query: queryStub,
				tooling: {
					query: queryStub
				},
				get: getStub
			};
	
			const packageInfo: PackageInfoI[] = await orgContextHelper.getPackagesInfo(connection);
			expect(packageInfo[0].packageName).to.eql('Test');
			expect(packageInfo[0].packageVersion).to.eql('2019.200.1');
			expect(packageInfo[0].packageVersionId).to.eql('121');
			expect(packageInfo[0].packageId).to.eql('1234');
			expect(packageInfo[0].isBeta).to.be.false;
			expect(packageInfo[0].betaName).to.eql(DEFAULT_NUMERIC_VALUE);
		});
	
		it('should package info with no patch version', async () => {
			const result = [
				{
					SubscriberPackage: {
						Name: 'Test',
						Id: 1234
					},
					SubscriberPackageVersion: {
						MajorVersion: 2019,
						MinorVersion: 200,
						PatchVersion: 0,
						Id: 123,
						IsBeta: false,
						BuildNumber: 2
					}
				}
			];
	
			queryStub = stub().yields(undefined, { records: result }).returns({});
	
			const connection = {
				accessToken: ACCESS_TOKEN,
				instanceUrl: INSTANCE_URL,
				login,
				query: queryStub,
				tooling: {
					query: queryStub
				},
				get: getStub
			};
	
			const packageInfo: PackageInfoI[] = await orgContextHelper.getPackagesInfo(connection);
			expect(packageInfo[0].packageName).to.eql('Test');
			expect(packageInfo[0].packageVersion).to.eql('2019.200');
			expect(packageInfo[0].packageVersionId).to.eql('123');
			expect(packageInfo[0].packageId).to.eql('1234');
			expect(packageInfo[0].isBeta).to.be.false;
			expect(packageInfo[0].betaName).to.eql(DEFAULT_NUMERIC_VALUE);
		});
	
		it('should return beta package info', async () => {
			const result = [
				{
					SubscriberPackage: {
						Name: 'Test 1',
						Id: 1234
					},
					SubscriberPackageVersion: {
						MajorVersion: 2019,
						MinorVersion: 200,
						PatchVersion: 1,
						Id: 123,
						IsBeta: true,
						BuildNumber: 2
					}
				}
			];
	
			queryStub = stub().yields(undefined, { records: result }).returns({});
	
			const connection = {
				accessToken: ACCESS_TOKEN,
				instanceUrl: INSTANCE_URL,
				login,
				query: queryStub,
				tooling: {
					query: queryStub
				},
				get: getStub
			};
	
			const packageInfo: PackageInfoI[] = await orgContextHelper.getPackagesInfo(connection);
			expect(packageInfo[0].packageName).to.eql('Test 1');
			expect(packageInfo[0].packageVersion).to.eql('2019.200');
			expect(packageInfo[0].packageVersionId).to.eql('123');
			expect(packageInfo[0].packageId).to.eql('1234');
			expect(packageInfo[0].isBeta).to.be.true;
			expect(packageInfo[0].betaName).to.eql(2);
		});
	
		it('should return error', async () => {
			const error = 'Not data retrieve';
			queryStub = stub().yields(error, undefined);
	
			const connection = {
				accessToken: ACCESS_TOKEN,
				instanceUrl: INSTANCE_URL,
				login,
				query: queryStub,
				tooling: {
					query: queryStub
				},
				get: getStub
			};
			const result = await orgContextHelper.getPackagesInfo(connection);
			expect(result).to.eql([]);
		});
	});
	

	describe('getUserInfoData', async () => {

		afterEach(() => {
			restore();
		});

		it('should return isMulticurrency org', async () => {
			stub(utils, 'executeAnonymous').resolves({success: true});

			const result = await orgContextHelper.getUserInfoData({});

			expect(result.isMulticurrency).to.equals(true);
		});

	});

	describe('getOrganizationData', () => {

		it('should return the org data when is sandbox', async () => {

			const connectionStub = {
				query: stub().yields(
					undefined,
					{
					records : [
						{
							IsSandbox: true,
							TrialExpirationDate: null,
							InstanceName: 'test instance',
							OrganizationType: 'test type',
							Id: 123,
							Domain: 'my-custom-domain'
						}
					]
				})
			};
			const orgData = await orgContextHelper.getOrganizationData(connectionStub);

			expect(orgData.isSandbox).to.be.true;
			expect(orgData.isTrial).to.be.false;
			expect(orgData.orgInstance).to.be.eq('test instance');
			expect(orgData.orgType).to.be.eq('test type');
			expect(orgData.orgCustomDomain).to.be.eq('my-custom-domain');
		});

		it('should return the org data when is trial', async () => {

			const connectionStub = {
				query: stub().yields(
					undefined,
					{
					records : [
						{
							IsSandbox: false,
							TrialExpirationDate: 1,
							InstanceName: 'test instance',
							OrganizationType: 'test type',
							Id: 123
						}
					]
				})
			};
			const orgData = await orgContextHelper.getOrganizationData(connectionStub);

			expect(orgData.isSandbox).to.be.false;
			expect(orgData.isTrial).to.be.true;
			expect(orgData.orgInstance).to.be.eq('test instance');
			expect(orgData.orgType).to.be.eq('test type');
		});

		it('should return empty object', async () => {

			const connectionStub = {
				query: stub().yields(
					'error',
					undefined
					)
			};
			const orgData = await orgContextHelper.getOrganizationData(connectionStub);

			expect(orgData.isSandbox).to.be.undefined;
			expect(orgData.isTrial).to.be.undefined;
			expect(orgData.orgInstance).to.be.eq('');
			expect(orgData.orgType).to.be.eq('');
			expect(orgData.orgCustomDomain).to.be.eq('');
		});
	});

	describe('getReleaseData', async () => {
		afterEach(() => {
			restore();
		});
	
		it('should return release data', async () => {
			const fakeResponse = {
				data: [
					{ label: 'TestSpring2019', version: '45' }
				]
			};
	
			const getStub = stub(axios, 'get').resolves(fakeResponse);
	
			const result = await orgContextHelper.getReleaseData('ExampleUrl');
	
			expect(getStub.calledOnce).to.be.true;
			expect(result.apiVersion).to.equal('45');
			expect(result.releaseVersion).to.equal('TestSpring2019');
		});
	});
	

	describe('retry', () => {

		function alwaysSucceeds(): Promise<string> {
			return Promise.resolve('Success');
		}
		
		function alwaysFails(): Promise<any> {
			return Promise.reject(new Error('Function always fails'));
		}
		  
		let attempt = 1;
		function succeedsOnThird(): Promise<string> {
			return new Promise((resolve, reject) => {
				if (attempt < 3) {
					attempt++;
					reject(new Error('Function failed'));
				} else {
					resolve('Success');
				}
			});
		}

		it('should retry a failing function until it succeeds', async () => {
			const fn = spy(alwaysSucceeds);
			const result = await orgContextHelper.retry(fn);
			expect(result).to.equal('Success');
			expect(fn.calledOnce).to.be.true;
		});
		
		it('should retry a failing function until it reaches the maximum number of retries', async () => {
			const fn = spy(alwaysFails);
			await expect(orgContextHelper.retry(fn)).to.be.rejectedWith('Failed to execute function after 3 attempts.');
			expect(fn.callCount).to.equal(3);
		}).timeout(8000);
	
		it('should retry a function that fails a few times before succeeding', async () => {
			const fn = spy(succeedsOnThird);
			const result = await orgContextHelper.retry(fn);
			expect(result).to.equal('Success');
			expect(fn.callCount).to.equal(3);
		}).timeout(5000);
	});
});
