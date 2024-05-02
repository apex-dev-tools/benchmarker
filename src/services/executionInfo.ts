/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */
import { PackageInfo } from '../database/entity/package';
import { ExecutionInfo } from '../database/entity/execution';
import { bulkSaveExecutionInfo } from '../database/executionInfo';
import { TestResult } from '../database/entity/result';
import { saveTestResults, TestResultI } from './saveTestResult';
import { OrgContext, createNewOrgInfo } from './orgContext/orgContext';
import { OrgInfo } from '../database/entity/org';
import { createNewPackages, getPackageInfoByPackageVersionId } from './packageInfo/packageInfo';
import { getExternalBuildId } from '../shared/env';

export async function saveExecutionInfo(testResults: TestResultI[], orgContext: OrgContext): Promise<ExecutionInfo[]> {
	const testResultsDB: TestResult[] = await saveTestResults(testResults);
	const testResultDBIds: number[] = testResultsDB.map((testResult: TestResult) => testResult.id);

	await createNewPackages(orgContext.packagesInfo);
	const packagesDB: PackageInfo[] = await getPackageInfoByPackageVersionId(orgContext.packagesInfo);
	const packageInfoDBIds: number[] = packagesDB.map((packageInfo: PackageInfo) => packageInfo.id);

	const orgInfoDB: OrgInfo = await createNewOrgInfo(orgContext.orgInfo);
	const orgInfoDBId: number = orgInfoDB.id;

	const executionInfoRows = await generateExecutionInfoRows(testResultDBIds, orgInfoDBId, packageInfoDBIds);
	return bulkSaveExecutionInfo(executionInfoRows);
}

function createExecutionInfo(
	resultId: number,
	orgInfoId: number,
	packageId: number | null,
	buildId: string
): ExecutionInfo {
	const executionInfo: ExecutionInfo = new ExecutionInfo();
	executionInfo.testResultId = resultId;
	executionInfo.orgInfoId = orgInfoId;
	if (packageId) executionInfo.packageInfoId = packageId;
	executionInfo.externalBuildId = buildId;

	return executionInfo;
}

const generateExecutionInfoRows = (testResultsIds: number[], orgInfoId: number, packagesId: number[]): ExecutionInfo[] => {
	const externalBuildId = getExternalBuildId();

	return testResultsIds
		.flatMap((testResultId: number) => {
			if (packagesId.length) {
				return packagesId.map((packageInfoId: number) =>
					createExecutionInfo(
						testResultId,
						orgInfoId,
						packageInfoId,
						externalBuildId
					)
				);
			}

			// packagesId could be empty for completely unmanaged org
			return [
				createExecutionInfo(testResultId, orgInfoId, null, externalBuildId)
			];
		});
};
