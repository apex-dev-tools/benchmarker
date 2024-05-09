/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */
/** @module BatchTestTemplate2 */
import { getAsyncMonitorTimeout } from '../shared/env';
import { Timer } from '../shared/timer';
import { ASYNC_PROCESS } from '../shared/constants';
import { TestPerformanceErrorI, delay } from '../shared/uiHelper';
import { TestResultI } from '../services/saveTestResult';
import { query } from '../services/salesforce/utils';
import { OrgContext, getOrgContext } from '../services/orgContext/orgContext';
import { saveExecutionInfo } from '../services/executionInfo';
import { cloneDeep } from 'lodash';
import { SalesforceConnection, connectToSalesforceOrg, getSalesforceAuthInfoFromEnvVars } from '../services/salesforce/connection';

interface BatchProcessResults {
	timer: Timer;
	ndocuments: number;
	nlines: number;
}

interface BatchProcessParams {
	connection: SalesforceConnection;
	apexJobId?: string;
	action: string;
	customParameter?: any;
}

/**
 * BatchProcessTestTemplate interface to handle the connection with and org and the status of a background process execution
 */
export interface BatchProcessCheckerParams extends BatchProcessParams {
	processStatusResult: BatchProcessStatusResult;
}

/**
 * BatchProcessTestTemplate interface to handle the status of a background process execution
 */
export interface BatchProcessStatusResult {
	startDate?: Date;
	endDate?: Date;
	timer?: Timer;
	failed?: boolean;
	errorMessage?: string;
}

/**
 * BatchProcessTestTemplate interface to handle the result when a background process starts
 */
export interface ProcessStartResult {
	apexJobId?: string;
	customParameter?: any;
}
/**
 * Test Template to create scenarios over batch processes
 */
export class BatchProcessTestTemplate {
	/**
	 * Initial number of documents to be posted
	 */
	public nDocumentsInitial: number;

	/**
	 * Initial number of lines to be posted
	 */
	public nLinesInitial: number;

	/**
	 * Describes what kind of action the test is going to perform
	 */
	public action: string;

	/**
	 * Product name
	 */
	public product: string;

	/**
	 * Object to handle the connection to a Salesforce Org
	 */
	public connection: SalesforceConnection;

	/**
	 * Defines the use case the test is going to cover. For example Form Load, Document Line Process, Document Process
	 */
	public testType: string;

	/**
	 * Set an initial metadata configuration if the test requires it
	 * @param connection object to handle the connection to a Salesforce Org
	 */
	public initialData: (connection: SalesforceConnection) => Promise<void>;

	/**
	 * Creates the data needed in the test
	 * @param ndocuments number of records to be created
	 * @param nlines number of child records to be created
	 * @param connection object to handle the connection to a Salesforce Org
	 */
	public dataCreation: (ndocuments: number, nlines: number, connection: SalesforceConnection) => Promise<boolean>;

	/**
	 * Deletes the data created in the test
	 * @param connection object to handle the connection to a Salesforce Org
	 */
	public dataDeletion: (connection: SalesforceConnection) => Promise<any>;

	/**
	 * Starts an asynchronous background process
	 * @param param object to handle the connection to a Salesforce Org
	 */
	public startProcess: (param: BatchProcessParams) => Promise<void | ProcessStartResult>;

	/**
	 * Checks if the current background process can be executed
	 * @param connection object to handle the connection to a Salesforce Org
	 */
	public checkProcessCanBeLaunched: (connection: SalesforceConnection) => Promise<boolean>;

	/**
	 * Checks job status for the current background process
	 * @param batchProcessParams object to gather the information related to batch process status
	 */
	public checkProcessStatus: (batchProcessParams: BatchProcessCheckerParams) => Promise<BatchProcessStatusResult>;

	public readonly batchStatusCheckingIntervalTime: number = +getAsyncMonitorTimeout() * 1000;
}

export namespace BatchProcess {
	/**
	 * Sets the configuration for the Test Template
	 * @param product Product name
	 * @param nDocumentsInitial initial number of records to be processed
	 * @param nLinesInitial initial number of child records to be processed
	 * @param action describes what kind of action the test is going to perform
	 * @param testType defines the use case the test is going to cover, by default Async Process
	 */
	export const build = async (
									product: string,
									nDocumentsInitial: number,
									nLinesInitial: number,
									action: string,
									testType: string = ASYNC_PROCESS
									): Promise<BatchProcessTestTemplate> => {

		const batchTestTemplate = new BatchProcessTestTemplate();
		batchTestTemplate.product = product;
		batchTestTemplate.nDocumentsInitial = nDocumentsInitial;
		batchTestTemplate.nLinesInitial = nLinesInitial;
		batchTestTemplate.action = action;
		batchTestTemplate.testType = testType;

		const connectionData = await connectToSalesforceOrg(getSalesforceAuthInfoFromEnvVars());
		batchTestTemplate.connection = connectionData;

		batchTestTemplate.checkProcessStatus = defaultCheckProcessStatus;

		return batchTestTemplate;
	};

	/**
	 * Creates the data needed for the test, performs actions with the data created, clean the data created for the tests and retrieve the performance results
	 * @param batchTestTemplate object with all the information required to execute a test
	 */
	export const performTestFlow = async (batchTestTemplate: BatchProcessTestTemplate) => {
		// Some processes can only be executed once at the same time
		const runProcess = await batchTestTemplate.checkProcessCanBeLaunched(batchTestTemplate.connection);
		console.log(`${batchTestTemplate.action} can be launched? ${runProcess}`);
		if (runProcess)
			await gatherResults(batchTestTemplate);
	};
}

const gatherResults = async (
								batchTestTemplate: BatchProcessTestTemplate,
								ndocuments: number = batchTestTemplate.nDocumentsInitial,
								nlines: number = batchTestTemplate.nLinesInitial
							) => {
	let processStartResult: ProcessStartResult | void = void 0;

	try {
		const dataCreationResult = await batchTestTemplate.dataCreation(ndocuments, nlines, batchTestTemplate.connection);

		if (dataCreationResult) {
			processStartResult = await batchTestTemplate.startProcess({connection: batchTestTemplate.connection, action: batchTestTemplate.action});

		} else {
			console.error(`${batchTestTemplate.action} data was not created correctly, the test execution will not continue`);
		}

	} catch (e) {
		console.error(`Exception on ${batchTestTemplate.action}, ${e.message}, error info: ${e.exception}`);
		const errorTimer: Timer = onError(batchTestTemplate, e);
		const errorResults = addResult({
			timer: errorTimer,
			ndocuments,
			nlines
		});

		await saveResults(batchTestTemplate, errorResults);
		await batchTestTemplate.dataDeletion(batchTestTemplate.connection);
		return;
	}

	if (processStartResult && (processStartResult.apexJobId || processStartResult.customParameter)) {
		if (batchTestTemplate.batchStatusCheckingIntervalTime > 0 ) // Mainly for testing
			await monitorAsyncProcessStatus(batchTestTemplate, {connection: batchTestTemplate.connection, apexJobId: processStartResult.apexJobId, customParameter: processStartResult.customParameter, action: batchTestTemplate.action, processStatusResult: {}})
				.then((processResult) => {
						const lastTimer = processResult.timer ? processResult.timer : onError(batchTestTemplate, processResult.error!);

						return addResult({
							timer: lastTimer,
							ndocuments,
							nlines
						});
				})
				.then((results) => saveResults(batchTestTemplate, results))
				.catch((e) => console.error(`Exception happened during ${batchTestTemplate.action} test execution: ${e}`))
				.finally(async () => {
					console.log(`Deleting data on ${batchTestTemplate.action}, timeStamp: ${new Date()}`);
					return await batchTestTemplate.dataDeletion(batchTestTemplate.connection); });
	} else {
		console.warn(`Unable to get ApexJobId for ${batchTestTemplate.action}, async process will not be monitored`);
		console.log(`Deleting data on ${batchTestTemplate.action}, timeStamp: ${new Date()}`);
		await batchTestTemplate.dataDeletion(batchTestTemplate.connection);
	}
};

const addResult = (result: BatchProcessResults) => {
	return new Array(result);
};

const onError = (batchTestTemplate: BatchProcessTestTemplate, e: TestPerformanceErrorI) => {
	return Timer.createFromException(`${batchTestTemplate.action}: error`, e);
};

const saveResults = async (batchTestTemplate: BatchProcessTestTemplate, results: BatchProcessResults[] ) => {
	console.log(`Saving results ${batchTestTemplate.action}, timeStamp: ${new Date()}`);

	let testResults: TestResultI[];

	testResults = results.map( (result: BatchProcessResults) => {
		const testResult: TestResultI = {
			timer: result.timer,
			action: batchTestTemplate.action,
			flowName: '',
			error: result.timer.error,
			product: batchTestTemplate.product,
			incognitoBrowser: false,
			lighthouseSpeedIndex: undefined,
			lighthouseTimeToInteractive: undefined,
			lines: result.nlines,
			documents: result.ndocuments,
			testType: batchTestTemplate.testType
		};

		return testResult;
	});

	const orgContext: OrgContext = await getOrgContext(batchTestTemplate.connection);

	await saveExecutionInfo(testResults, orgContext);
};

const defaultCheckProcessStatus = async (batchProcessParams: BatchProcessParams): Promise<BatchProcessStatusResult> => {
	console.log(`Default BatchTestTemplate process status checker: Checking Job Status for apexJobId ${batchProcessParams.apexJobId}`);
	const response = await query( batchProcessParams.connection , `select status, CompletedDate, CreatedDate, NumberOfErrors, ExtendedStatus from AsyncApexJob WHERE id = '${batchProcessParams.apexJobId}'`);

	const statusCheckResult: BatchProcessStatusResult = {};

	if (response.records.length > 0) {
		const apexJobRecord = response.records[0];
		console.info(`Checking ${batchProcessParams.action} job status, currently it is: ${apexJobRecord.Status}, NumberOfErrors: ${apexJobRecord.NumberOfErrors}, PID: ${process.pid} ,timeStamp: ${new Date()}`);

		if (apexJobRecord.NumberOfErrors > 0) {
			apexJobRecord.Status = 'Failed';
		}

		switch (apexJobRecord.Status) {
			case 'Queued':
			case 'Holding':
			case 'Preparing':
			case 'Processing':
				statusCheckResult.failed = false;
				break;
			case 'Aborted':
				statusCheckResult.failed = true;
				statusCheckResult.errorMessage = 'Aborted by user';
				break;
			case 'Failed':
				statusCheckResult.failed = true;
				statusCheckResult.errorMessage = apexJobRecord.ExtendedStatus || 'Job failed';
				break;
			case 'Completed':
				const timer: Timer = Timer.create([{label: batchProcessParams.action}])[0];
				const startDate = new Date(apexJobRecord.CreatedDate);
				const endDate = new Date(apexJobRecord.CompletedDate);
				const diff = (endDate.getTime() - startDate.getTime());
				timer.setTime(diff);
				statusCheckResult.failed = false;
				statusCheckResult.timer = timer;
				console.info(`${batchProcessParams.action} lasted ${diff / 1000} seconds`);
				break;
		}
	}
	return Promise.resolve(statusCheckResult);
};

const monitorAsyncProcessStatus = async (batchTestTemplate: BatchProcessTestTemplate, batchParams: BatchProcessCheckerParams): Promise<{timer?: Timer, error?: TestPerformanceErrorI}> => {
	await delay(batchTestTemplate.batchStatusCheckingIntervalTime);

	const result: BatchProcessStatusResult = await batchTestTemplate.checkProcessStatus({connection: batchParams.connection, action: batchParams.action, apexJobId: batchParams.apexJobId, customParameter: batchParams.customParameter , processStatusResult: batchParams.processStatusResult});

	if (result.failed) {
		return Promise.resolve( {error: { message: (result.errorMessage || 'Error produced in batch but no info was provided')}});
	}

	if (result.timer) {
		return Promise.resolve({timer: result.timer});
	}

	const newBatchParams = cloneDeep(batchParams);
	newBatchParams.processStatusResult = result;

	return Promise.resolve(await monitorAsyncProcessStatus(batchTestTemplate, newBatchParams));
};
