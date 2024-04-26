/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { TestResult } from './entity/result';
import { getConnection } from './connection';
import { createTables } from './testResult/table';
import { runningOnLocalMode } from '../services/localMode';

const save = async (testResult: TestResult) => {
	const connection = await getConnection();
	const testResultInserted = await connection.manager.save(testResult);
	return testResultInserted;
};

const saveList = async (testResult: TestResult[]) => {
	const connection = await getConnection();
	const testResultsInserted = await connection.manager.save(testResult);
	return testResultsInserted;
};

export const testResultModel: TestResultModel = {
	save,
	saveList
};

interface TestResultModel {
	save(testResult: TestResult): Promise<TestResult>;
	saveList(testResults: TestResult[]): Promise<TestResult[]>;
}

export async function saveTestResult(testStepResults: TestResult[]) {
	if (!runningOnLocalMode()) {
		return testResultModel.saveList(testStepResults);
	} else {
		const { standard, governorLimits, errors } = createTables(testStepResults);
		console.log(standard);
		console.log(governorLimits);
		console.log(errors);
		return [new TestResult()];
	}
}
