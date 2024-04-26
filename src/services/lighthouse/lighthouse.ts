/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Page } from 'puppeteer';
import { config } from './config.performance';
import { getIsIncognitoBrowser } from '../../shared/env';

export const gatherLighthouseMetrics = async (page: Page, outputFormat: string, headless: boolean): Promise<string> => {
	// @ts-ignore
	const lighthouse = (await import('lighthouse')).default

	const port = page.browser().wsEndpoint().split(':')[2].split('/')[0];
	const opts = {
		port,
		output: outputFormat,
		emulatedFormFactor: 'desktop',
		throttlingMethod: 'provided',
		disableStorageReset:  !getIsIncognitoBrowser(),
		chromeFlags: headless ? '--headless' : ''
	};

	return lighthouse(page.url(), opts, config)
		.then((results: any) => {
			delete results.artifacts;
			return results.report;
		});
};
