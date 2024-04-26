/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { ElementHandle, Frame, HTTPResponse } from 'puppeteer';
import { INavigate, INavigateConfig } from './types';
import { searchSelector } from '../../shared/uiHelper';
import { getAppLauncherSelector, getAppLanucherAllTabsSelector, getAppLauncherTabSelector } from '../../shared/env';

async function goToFrontdoor(config: INavigateConfig, frontdoorUrl: string): Promise<HTTPResponse | null> {
	const page = config.page;
	const response = await page.goto(frontdoorUrl, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 30000 });
	return response;
}

export async function goToAllTabsTab(config: INavigateConfig, tabName: string, tabAttribute?: string): Promise<ElementHandle> {
	const page = config.page;

	const appLauncherButton = await searchSelector(page, getAppLauncherSelector(), false, 60000);
	await appLauncherButton.click();

	const appLauncherViewAll = await searchSelector(page, getAppLanucherAllTabsSelector(), false, 60000);
	await appLauncherViewAll.click();

	tabAttribute = tabAttribute !== undefined ? tabAttribute : '';
	const element = await searchSelector(page, getAppLauncherTabSelector(tabName, tabAttribute), false, 60000);

	return element;
}

async function getVfFrame(config: INavigateConfig): Promise<Frame> {
	const page = config.page;

	const vfFramePrefix = 'vfFrameId'; // Autogenerated by SF, e.g. "vfFrameId_1531834217894"

	let pageFrames: Frame[];
	if (config.title) {
		await page.waitForSelector(`iframe[name*="${vfFramePrefix}"][title*="${config.title}"]`, { timeout: 60000, visible : true });
		pageFrames = [];
		for (const frame of page.frames()) {
			const frameTitle = await frame.title();
			if (frameTitle.includes(config.title) && frame.name()) {
				pageFrames.push(frame);
			}
		}
	} else {
		await page.waitForSelector(`iframe[name*="${vfFramePrefix}"]`, { timeout: 60000, visible : true });
		pageFrames = await page.frames();
	}

	const result: Frame| undefined = pageFrames.find((x) => {
		let iframeFound = x.name().includes(vfFramePrefix) ;
		if ( iframeFound )
			if ( config.pageDomain )
				iframeFound = x.url().toLocaleLowerCase().includes(config.pageDomain.toLocaleLowerCase());

		return iframeFound;
	});
	return result as Frame;
}

async function homeIsLoaded(config: INavigateConfig): Promise<ElementHandle | null> {
	return await config.page.waitForSelector(getAppLauncherSelector());
}

export const navigate: INavigate = {
	goToAllTabsTab,
	getVfFrame,
	homeIsLoaded,
	goToFrontdoor
};
