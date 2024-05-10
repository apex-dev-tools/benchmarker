/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Page } from 'puppeteer';
import { config } from './config.performance';
import { getIsIncognitoBrowser } from '../../shared/env';
import lighthouse, { Flags, OutputMode } from 'lighthouse';

export const gatherLighthouseMetrics = async (page: Page, outputFormat: OutputMode): Promise<string> => {
	const port = page.browser().wsEndpoint().split(':')[2].split('/')[0];
	const opts: Flags = {
		port: port ? parseInt(port) : undefined,
		output: outputFormat,
		formFactor: 'desktop',
		throttlingMethod: 'provided',
		disableStorageReset: !getIsIncognitoBrowser()
	};

	return lighthouse(page.url(), opts, config)
		.then((results: any) => {
			delete results.artifacts;
			return results.report;
		});
};
