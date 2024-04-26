/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { getIsIncognitoBrowser } from '../shared/env';
import { Timer } from '../shared/timer';
import { TestResultI } from '../services/saveTestResult';
import createDebug from 'debug';
import { MOCKPRODUCT_FULLNAME, FORM_LOAD } from '../shared/constants';
import { OrgContext, getOrgContext } from '../services/orgContext/orgContext';
import { saveExecutionInfo } from '../services/executionInfo';
import { PackageInfoI } from '../services/packageInfo/packageInfo';
import * as orgContextHelper from '../services/orgContext/helper';
import { stub } from 'sinon';
import { SalesforceConnection } from '../services/salesforce/connection';

describe('Mock test', () => {
	let testResults: TestResultI[];

	let timers: Timer[];

	const debug = createDebug('app:info');

	it('Mock flow', async function() {
		this.timeout(0);
		debug('startig mock test');
		timers = [];

		const [t1, t2] = Timer.create(
			[
				{
					label: 'flow 1',
					targetValue: 3000
				},
				{
					label: 'flow 2',
					targetValue: 3000
				}
			]
		);

		t1.start();

		await sleep(2500);

		t2.start();

		await sleep(1000);

		t1.end();
		t2.end();

		timers.push(t1);
		timers.push(t2);
	});

	after(async function() {
		this.timeout(30000);

		testResults = timers.map( (timer: Timer) => {
			const testResult: TestResultI = {
				timer,
				action: timer.getDescription(),
				flowName: 'mock test',
				product: MOCKPRODUCT_FULLNAME,
				incognitoBrowser: getIsIncognitoBrowser(),
				testType: FORM_LOAD
			};

			return testResult;
		});

		setOrgContextMocks();
		const orgContext: OrgContext = await getOrgContext({} as SalesforceConnection);

		await saveExecutionInfo(testResults, orgContext);
	});

	function setOrgContextMocks() {
		stub(orgContextHelper, 'getUserInfoData').resolves({isMulticurrency: true});
		stub(orgContextHelper, 'getOrganizationData').resolves({
			orgID: 'ORGID1234',
			orgInstance: 'MOCKINSTANCE',
			isSandbox: false,
			isTrial: false,
			orgType: 'MOCKTYPE'
		});
		stub(orgContextHelper, 'getIsLex').resolves(true);
		stub(orgContextHelper, 'getReleaseData').resolves({
			releaseVersion: 'Test 2019',
			apiVersion: '48',
		});

		const package1: PackageInfoI = {
			packageName: 'mockPackage1',
			packageVersion: '1234.1',
			packageVersionId: '1234',
			packageId: 'A1234',
			isBeta: false,
			betaName: 1
		};

		const package2: PackageInfoI = {
			packageName: 'mockPackage2',
			packageVersion: '1234.1',
			packageVersionId: '1234',
			packageId: 'A1234',
			isBeta: false,
			betaName: 2
		};

		const packagesInfo: PackageInfoI[] = [
			package1,
			package2
		];

		stub(orgContextHelper, 'getPackagesInfo').resolves(packagesInfo);
	}

	async function sleep(ms: number) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		});
	}
});
