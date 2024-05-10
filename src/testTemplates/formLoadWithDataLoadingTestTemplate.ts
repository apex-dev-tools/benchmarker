/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { DEFAULT_NUMERIC_VALUE, ERROR_OPENING_BROWSER, FORM_LOAD_WITH_DATA_LOADING } from '../shared/constants';
import { getIsIncognitoBrowser, getPuppeteerLaunchOptions, isHeadless } from '../shared/env';
import { TestResultI } from '../services/saveTestResult';
import { Timer } from '../shared/timer';
import { TestPerformanceErrorI } from '../shared/uiHelper';
import { BrowserContext, Page, launch, Browser } from 'puppeteer';
import { INavigate } from '../services/navigate/types';
import { getNavigation } from '../services/navigate/navigate';
import { OrgContext, getOrgContext } from '../services/orgContext/orgContext';
import { saveExecutionInfo } from '../services/executionInfo';
import { connectToSalesforceOrg, getSalesforceAuthInfoFromEnvVars, SalesforceConnection } from '../services/salesforce/connection';
import { getLoginUrl } from '../services/orgContext/helper';

interface FormLoadWithDataLoadingResults {
	timer: Timer;
	lines: number;
}

/**
 * Test Template to create data and performs UI actions over objects with one headers and multiple lines
 */
export class FormLoadWithDataLoadingTestTemplate {
	/**
	 * Initial number of lines to be created
	 */
	public linesInitial: number;

	/**
	 * Increase in the number of lines to be created
	 */
	public linesPerIteration: number;

	/**
	 * Maximum value of lines to be created
	 */
	public linesMaximum?: number;

	/**
	 * Describes what kind of action the test is going to perfrom
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
	 * Object that provides methods to interact with a single tab in Chromium
	 */
	public page: Page;

	/**
	 * URL to direct users to an authorization endpoint for a provided Org
	 */
	public frontdoorUrl: string;

	/**
	 * Object that provide functionality to navigate between URLs
	 */
	public navigator: INavigate;

	/**
	 * Object to interact with Chromium instance
	 */
	public browser: Browser;

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
	 * @param documentLines number of lines to be created
	 * @param connection object to handle the connection to a Salesforce Org
	 */
	public dataCreation: (documentLines: number, connection: SalesforceConnection) => Promise<void>;

	/**
	 * Deletes the data created in the test
	 * @param connection object to handle the connection to a Salesforce Org
	 */
	public dataDeletion: (connection: SalesforceConnection) => Promise<any>;

	/**
	 * Performs operations with the data created in the test
	 * @param connection object to handle the connection to a Salesforce Org
	 */
	public performFlow: (connection: SalesforceConnection) => Promise<Timer>;
}

export namespace FormLoadWithDataLoading {
	/**
	 * Sets the configuration for the Test Template
	 * @param product Product name
	 * @param linesInitial initial number of lines to be created
	 * @param linesPerIteration increase in the number of lines to be created
	 * @param linesMaximum maximum value of lines to be created
	 * @param action describes what kind of action the test is going to perfrom
	 * @param testType defines the use case the test is going to cover, by default Form Load with Data Loading
	 */
	export const build = async (product: string, linesInitial: number, linesPerIteration: number, linesMaximum: number, action: string, testType: string = FORM_LOAD_WITH_DATA_LOADING): Promise<FormLoadWithDataLoadingTestTemplate> => {
		const fldlTestTemplate = new FormLoadWithDataLoadingTestTemplate();
		fldlTestTemplate.product = product;
		fldlTestTemplate.linesInitial = linesInitial;
		fldlTestTemplate.linesPerIteration = linesPerIteration;
		fldlTestTemplate.linesMaximum = linesMaximum;
		fldlTestTemplate.action = action;
		fldlTestTemplate.testType = testType;

		const connectionData = await connectToSalesforceOrg(getSalesforceAuthInfoFromEnvVars());
		fldlTestTemplate.connection = connectionData;
		await getNavigationPage(fldlTestTemplate);
		return fldlTestTemplate;
	};

	/**
	 * Creates the data needed for the test, performs actions with the data creted, clean the data created for the tests and retrieve the performance results
	 * @param fldlTestTemplate object with the information required to execute a test
	 */
	export const performTestFlow = async (fldlTestTemplate: FormLoadWithDataLoadingTestTemplate) => {
		try {
			const results = await gatherResults(fldlTestTemplate);
			await saveResults(fldlTestTemplate, results);
		} catch (e) {
			console.log(`Error occured: ${JSON.stringify(e)}`);
		}

		try {
			await fldlTestTemplate.dataDeletion(fldlTestTemplate.connection);
		} catch (e) {
			console.log(`Error occurred during data deletion: ${JSON.stringify(e)}`);
		}
	};
}

const getNavigationPage = async (fldlTestTemplate: FormLoadWithDataLoadingTestTemplate) => {
	let context: BrowserContext;
	let browserOpened = false;
	let attempt = 0;
	let incognitoRequired: boolean;

	while (!browserOpened && attempt < 3) {
		try {
			fldlTestTemplate.frontdoorUrl = await getLoginUrl(fldlTestTemplate.connection);
			fldlTestTemplate.navigator = await getNavigation(fldlTestTemplate.connection);

			fldlTestTemplate.browser = await getBrowser();
			incognitoRequired = getIsIncognitoBrowser();
			context = incognitoRequired ? await fldlTestTemplate.browser.createBrowserContext() : fldlTestTemplate.browser.browserContexts()[0];

			fldlTestTemplate.page = await context.newPage();
			await fldlTestTemplate.page.setViewport({
				width  : 1920,
				height : 1080,
			});
			browserOpened = true;
		} catch (e) {
			attempt++;
		}
	}

	if (!browserOpened) {
		console.log(ERROR_OPENING_BROWSER);
	}
};

const gatherResults = async (fldlTestTemplate: FormLoadWithDataLoadingTestTemplate, resultsAccumulator: FormLoadWithDataLoadingResults[] = [], iteration: number = 1, lines: number = fldlTestTemplate.linesInitial) => {
	try {
		await fldlTestTemplate.dataCreation(lines, fldlTestTemplate.connection);
		const iterationTimer = await fldlTestTemplate.performFlow(fldlTestTemplate.connection);

		resultsAccumulator = addResult(resultsAccumulator, {
			timer: iterationTimer,
			lines
		});

		const newLines = getLinesForIteration(fldlTestTemplate, iteration++);

		if (newLines > 0 && iterationTimer.getTime() > 0)
			resultsAccumulator = await gatherResults(fldlTestTemplate, [...resultsAccumulator], iteration++, newLines);

	} catch (e) {
		const errorTimer: Timer = onError(fldlTestTemplate, e);
		resultsAccumulator = addResult(resultsAccumulator, {
			timer: errorTimer,
			lines
		});
	}

	return resultsAccumulator;
};

const getLinesForIteration = (fldlTestTemplate: FormLoadWithDataLoadingTestTemplate, iteration: number) => {
		const estimatedLines = fldlTestTemplate.linesInitial + (fldlTestTemplate.linesPerIteration * iteration);
		if (fldlTestTemplate.linesMaximum && fldlTestTemplate.linesMaximum > DEFAULT_NUMERIC_VALUE && estimatedLines > fldlTestTemplate.linesMaximum )
			return -1;

		return estimatedLines;
};

const addResult = (processResults: FormLoadWithDataLoadingResults[], result: FormLoadWithDataLoadingResults) => {
	const newProcessResults: FormLoadWithDataLoadingResults[] = [...processResults];
	newProcessResults.push(result);

	return newProcessResults;
};

const onError = (fldlTestTemplate: FormLoadWithDataLoadingTestTemplate, e: TestPerformanceErrorI) => {
	return Timer.createFromException(`${fldlTestTemplate.action}: error`, e);
};

const saveResults = async (fldlTestTemplate: FormLoadWithDataLoadingTestTemplate, results: FormLoadWithDataLoadingResults[] ) => {
	console.log(`Saving results...`);
	let testResults: TestResultI[];

	testResults = results.map( (result: FormLoadWithDataLoadingResults) => {
		const testResult: TestResultI = {
			timer: result.timer,
			action: fldlTestTemplate.action,
			flowName: result.timer.getDescription().split(':')[1].trim(),
			error: result.timer.error,
			product: fldlTestTemplate.product,
			incognitoBrowser: false,
			lighthouseSpeedIndex: undefined,
			lighthouseTimeToInteractive: undefined,
			lines: result.lines,
			testType: fldlTestTemplate.testType
		};

		return testResult;
	});

	const orgContext: OrgContext = await getOrgContext(fldlTestTemplate.connection);

	await saveExecutionInfo(testResults, orgContext);

	if (fldlTestTemplate.browser) {
		await fldlTestTemplate.browser.close();
	}
};

const getBrowser = async () => {
	const launchOptions = getPuppeteerLaunchOptions(isHeadless());
	return launch(launchOptions);
};
