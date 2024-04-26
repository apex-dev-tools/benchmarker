/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { TransactionTestTemplate, TestFlowOutput, GovernorMetricsResult } from './transactionTestTemplate';
import { Timer } from '../shared/timer';
import { TestResultI } from '../services/saveTestResult';
import { OrgContext, getOrgContext } from '../services/orgContext/orgContext';
import { saveExecutionInfo } from '../services/executionInfo';

/**
 * Retrieve peformance metrics from a tests execution and save them
 * @param processTestTemplate object with the information required to execute a test
 * @param results results of the test steps executions
 */
export const saveResults = async (processTestTemplate: TransactionTestTemplate, results: TestFlowOutput[]) => {

	const testResults = results.map( (flowOutput: TestFlowOutput) => {
		const action: string = flowOutput.testStepDescription.action;
		const flowName: string = flowOutput.testStepDescription.flowName;
		const result: GovernorMetricsResult = flowOutput.result;
		const testTimer = new Timer('');
		testTimer.setTime(result.timer);
		const testStep: TestResultI = {
			timer: testTimer,
			cpuTime: result.cpuTime,
			dmlRows: result.dmlRows,
			dmlStatements: result.dmlStatements,
			heapSize: result.heapSize,
			queryRows: result.queryRows,
			soqlQueries: result.soqlQueries,
			action,
			flowName,
			error: flowOutput.error ? flowOutput.error : '',
			product: processTestTemplate.product,
			incognitoBrowser: false,
			lighthouseSpeedIndex: undefined,
			lighthouseTimeToInteractive: undefined,
			testType: processTestTemplate.testType
		};

		return testStep;
	});

	const orgContext: OrgContext = await getOrgContext(processTestTemplate.connection);

	await saveExecutionInfo(testResults, orgContext);
};
