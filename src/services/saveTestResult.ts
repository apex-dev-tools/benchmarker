/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Timer } from '../shared/timer';
import { TestResult } from '../database/entity/result';
import { DEFAULT_NUMERIC_VALUE } from '../shared/constants';
import { saveTestResult } from '../database/testResult';

export interface TestResultI {
	timer: Timer;
	action: string;
	flowName: string;
	product: string;
	incognitoBrowser: boolean;
	testType: string;
	error?: string;
	lighthouseSpeedIndex?: number;
	lighthouseTimeToInteractive?: number;
	lines?: number;
	documents?: number;
	cpuTime?: number;
	dmlRows?: number;
	dmlStatements?: number;
	heapSize?: number;
	queryRows?: number;
	soqlQueries?: number;
}

export async function saveTestResults(testResultsInfo: TestResultI[]): Promise<TestResult[]> {

	const testResults: TestResult[] = testResultsInfo.map((testResultInfo: TestResultI) => {
		const testResult: TestResult = new TestResult();
		testResult.duration = testResultInfo.timer.getTime();
		testResult.targetValue = testResultInfo.timer.targetValue;
		testResult.action = testResultInfo.action;
		testResult.flowName = testResultInfo.flowName;
		testResult.error = testResultInfo.error ? testResultInfo.error : '';
		testResult.product = testResultInfo.product;
		testResult.incognitoBrowser = testResultInfo.incognitoBrowser;
		testResult.lighthouseSpeedIndex = testResultInfo.lighthouseSpeedIndex || DEFAULT_NUMERIC_VALUE;
		testResult.lighthouseTimeToInteractive = testResultInfo.lighthouseTimeToInteractive || DEFAULT_NUMERIC_VALUE;
		testResult.dlpLines = testResultInfo.lines || DEFAULT_NUMERIC_VALUE;
		testResult.dpDocuments = testResultInfo.documents || DEFAULT_NUMERIC_VALUE;
		testResult.testType = testResultInfo.testType;
		testResult.cpuTime = testResultInfo.cpuTime !== undefined ? testResultInfo.cpuTime : DEFAULT_NUMERIC_VALUE;
		testResult.dmlRows = testResultInfo.dmlRows !== undefined ? testResultInfo.dmlRows : DEFAULT_NUMERIC_VALUE;
		testResult.dmlStatements = testResultInfo.dmlStatements !== undefined ? testResultInfo.dmlStatements : DEFAULT_NUMERIC_VALUE;
		testResult.heapSize = testResultInfo.heapSize !== undefined ? testResultInfo.heapSize : DEFAULT_NUMERIC_VALUE;
		testResult.queryRows = testResultInfo.queryRows !== undefined ? testResultInfo.queryRows : DEFAULT_NUMERIC_VALUE;
		testResult.soqlQueries = testResultInfo.soqlQueries !== undefined ? testResultInfo.soqlQueries : DEFAULT_NUMERIC_VALUE;

		return testResult;
	});

	return saveTestResult(testResults);
}
