/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */
import { SalesforceConnection } from '../services/salesforce/connection';
import { FlowStep, TestStepDescription, TestFlowOptions } from './transactionTestTemplate';
import { extractGovernorMetricsFromGenericApexFlow } from '../services/salesforce/utils';
import { readFile } from '../services/filesystem/filesystem';
import { replaceTokensInString } from '../services/tokenReplacement';

/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexScriptPath path of the file the Apex code to be executed
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 * @param [testFlowOptions] optional, replaces values in the Apex scripts, for examples datetimes values
 */
export const createApexExecutionTestStepFlow = async (connection: SalesforceConnection, apexScriptPath: string, testStepDescription: TestStepDescription, testFlowOptions?: TestFlowOptions): Promise<FlowStep> => {
	const governorMetricsApexClass = await readFile(await require.resolve('./apex/GovernorLimits.cls'));
	const originalApexFileContent = await readFile(apexScriptPath);
	const processedApexFileContent = replaceTokensInString(originalApexFileContent, testFlowOptions?.tokenMap);
	return createApexExecutionTestStepFlowFromApex(connection, governorMetricsApexClass + processedApexFileContent, testStepDescription);
};
/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexCode the apex code which the FlowStep object should be constructed with
 * @param testStepDescription adds information about the name of the flow to be executed and the action perfromed
 */
export const createApexExecutionTestStepFlowFromApex = async (connection: SalesforceConnection, apexCode: string, testStepDescription: TestStepDescription): Promise<FlowStep> => {
	return async () => {
		const flowStep = {
			testStepDescription,
			result: await extractGovernorMetricsFromGenericApexFlow(connection, testStepDescription, apexCode)
		};
		return flowStep;
	};
};
