/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Timer } from '../shared/timer';
import { BrowserContext, Page, launch, Browser } from 'puppeteer';
import { getIsIncognitoBrowser, getLighthouseHTMLReport, isHeadless, getLighthouseEnabled, getPuppeteerLaunchOptions } from '../shared/env';
import { ERROR_OPENING_BROWSER, FORM_LOAD } from '../shared/constants';
import { TestPerformanceErrorI } from '../shared/uiHelper';
import { getNavigation } from '../services/navigate/navigate';
import { INavigate } from '../services/navigate/types';
import { getLighthouseMetrics, getLighthouseMetricsAndSaveFile, ProcessedLigthouseMetrics } from '../services/metrics';
import moment from 'moment';
import { OrgContext, getOrgContext } from '../services/orgContext/orgContext';
import { saveExecutionInfo } from '../services/executionInfo';
import { SalesforceConnection, connectToSalesforceOrg, getSalesforceAuthInfoFromEnvVars } from '../services/salesforce/connection';
import { getLoginUrl } from '../services/orgContext/helper';
import { TestResultI } from '../services/saveTestResult';

interface BenchmarkerPage {
	pageName: string;
	lighthouseEnabled: boolean;
}

interface MetricsSuite {
	timer: Timer;
	lighthouseMetrics: {
		speedIndex: number | undefined,
		timeToInteractive: number | undefined
	};
}

/**
 * Test Template to perform UI testing using Chromium
 */
export class FormLoadTestTemplate {
	private _connection: SalesforceConnection;
	private _timer: Timer;
	private _frontdoorUrl: string;
	private _navigator: INavigate;
	private _page: Page;
	private _defaultTimer: Timer | undefined;
	private _product: string;
	private _incognitoRequired: boolean;
	private _browser: Browser;
	private _testType: string;

	private _metricsArray: MetricsSuite[] = [];

	/**
	 * Constructs a new FormLoadTestTemplate given a product and a testType
	 * @param product Product name
	 * @param testType defines the use case the test is going to cover, by default Form Load
	 */
	public constructor({product, testType = FORM_LOAD}: {product: string, testType?: string}) {
		this._product = product;
		this._testType = testType;
	}
	/**
	 * Gets the page object that provides methods to interact with a single tab in Chromium
	 */
	get page() {
		return this._page;
	}

	/**
	 * Gets navigator object that provide functionality to navigate between URLs
	 */
	get navigator() {
		return this._navigator;
	}

	/**
	 * Gets URL to direct users to an authorization endpoint for a provided Org
	 */
	get frontdoorUrl() {
		return this._frontdoorUrl;
	}

	/**
	 * Gets timer object to measure time in tests
	 */
	get timer() {
		return this._timer;
	}

	/**
	 * Sets a value for the timer object
	 */
	set timer(timer: Timer) {
		this._timer = timer;
	}

	/**
	 * Gets testType attribute
	 */
	get testType() {
		return this._testType;
	}

	/**
	 * Function to be called before the test run to connect to an Org and configure the browser to run the UI tests
	 */
	public async before() {
		let context: BrowserContext;

		let browserOpened = false;
		let attempt = 0;

		this._connection = await connectToSalesforceOrg(getSalesforceAuthInfoFromEnvVars());

		while (!browserOpened && attempt < 3) {
			try {
				this._frontdoorUrl = await getLoginUrl(this._connection);
				this._navigator = await getNavigation(this._connection);

				this._browser = await this.getBrowser();
				this._incognitoRequired = getIsIncognitoBrowser();
				context = this._incognitoRequired ? await this._browser.createBrowserContext() : this._browser.browserContexts()[0];

				this._page = await context.newPage();
				await this.page.setViewport({
					width  : 1920,
					height : 1080,
				});
				browserOpened = true;
			} catch (e) {
				attempt++;
			}
		}

		if (!browserOpened) {
			console.error(ERROR_OPENING_BROWSER);
		}
	}

	/**
	 * Function to place the UI test code
	 * @param callback function to perform test UI flow
	 */
	public async it(callback: () => void, configuration: BenchmarkerPage | string)  {

		let pageName: string;

		const lighthouseFeatureEnabled: boolean = getLighthouseEnabled();
		let lighthouseEnabled: boolean;
		let lighthouseSpeedIndex: number;
		let lighthouseTimeToInteractive: number;

		if (typeof configuration === 'string') {
			pageName = configuration;
			lighthouseEnabled = true;
		} else {
			({ pageName, lighthouseEnabled } = configuration as BenchmarkerPage);
		}

		try {
			this._defaultTimer = new Timer(`Load page: ${pageName}`);
			await callback();

			if (lighthouseFeatureEnabled && lighthouseEnabled && !this._incognitoRequired) {
				if (getLighthouseHTMLReport()) {
					await getLighthouseMetricsAndSaveFile('lighthouse-report',  `${pageName}_${moment().format()}.html`, this._page, isHeadless());
				} else {
					const lighthouseMetrics: ProcessedLigthouseMetrics[] = await getLighthouseMetrics(this._page, isHeadless());
					lighthouseSpeedIndex = Math.round(lighthouseMetrics.find((metricItem) => metricItem.metric === 'speed-index')!.value);
					lighthouseTimeToInteractive = Math.round(lighthouseMetrics.find((metricItem) => metricItem.metric === 'interactive')!.value);
				}

			}
		} catch (e) {
			console.log(`TestTemplate: error catched ${JSON.stringify(e)}`);
			this.timer = this.timer || this._defaultTimer;
			this.onError(this.timer.getDescription(), e);
		} finally {
			this._metricsArray.push(
				{
					timer: this.timer,
					lighthouseMetrics: {
						speedIndex: lighthouseSpeedIndex!,
						timeToInteractive: lighthouseTimeToInteractive!
					}
				}
			);

			this._defaultTimer = undefined;
		}
	}

	/**
	 * Function to be called after the test execution in order to retrieve the test results and save them
	 */
	public async after() {
		console.log(`Saving FormLoadTestTemplate test results`);
		let testResults: TestResultI[];

		testResults = this._metricsArray.map( (metricsItem: MetricsSuite) => {
			const testResult: TestResultI = {
				timer: metricsItem.timer,
				action: metricsItem.timer.getDescription().split(':')[0].trim(),
				flowName: metricsItem.timer.getDescription().split(':')[1].trim(),
				error: metricsItem.timer.error,
				product: this._product,
				incognitoBrowser: this._incognitoRequired,
				lighthouseSpeedIndex: metricsItem.lighthouseMetrics.speedIndex,
				lighthouseTimeToInteractive: metricsItem.lighthouseMetrics.timeToInteractive,
				testType: this._testType
			};

			return testResult;
		});

		const orgContext: OrgContext = await getOrgContext(this._connection);

		await saveExecutionInfo(testResults, orgContext);

		if (this._browser)
			await this._browser.close();
	}

	private onError(pageName: string, e: TestPerformanceErrorI) {
		this.timer = Timer.createFromException(pageName, e);
	}

	private async getBrowser() {
		const launchOptions = getPuppeteerLaunchOptions(isHeadless());
		return launch(launchOptions);
	}

}
