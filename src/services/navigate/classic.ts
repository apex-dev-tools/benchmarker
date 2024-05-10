/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { ElementHandle, Frame, HTTPResponse } from 'puppeteer';
import { INavigate, INavigateConfig } from './types';

async function goToFrontdoor(config: INavigateConfig, frontdoorUrl: string): Promise<HTTPResponse | null> {
	const page = config.page;
	const response = page.goto(frontdoorUrl, { waitUntil: 'domcontentloaded', timeout: 0 });
	return response;
}

async function goToAllTabsTab(config: INavigateConfig, tabName?: string): Promise<ElementHandle<Node> | null> {
	const page = config.page;
	const doNavigate = config.doNavigate !== undefined ? config.doNavigate : true;

	const xpathPartTabName = tabName ? ` and text()="${tabName}"` : '';
	const element = await page.waitForSelector(`xpath///a[contains(@class, "listRelatedObject")${xpathPartTabName}]`);

	if (tabName && doNavigate) {

		if (!element) {
			throw new Error('All tab not found.');
		}

		await Promise.all([
			page.waitForNavigation(),
			(element as ElementHandle<Element>).click()
		]);
	}

	return element;
}

async function getVfFrame(config: INavigateConfig): Promise<Frame> {
	const page = config.page;
	return page.mainFrame();
}

async function homeIsLoaded(config: INavigateConfig): Promise<ElementHandle | null> {
	const page = config.page;

	await page.waitForNavigation();
	const appSwitcherSelector = 'div[title="App Menu"]';
	const result = await page.waitForSelector(appSwitcherSelector);

	return result;
}

export const navigate: INavigate = {
	goToAllTabsTab,
	getVfFrame,
	homeIsLoaded,
	goToFrontdoor
};
