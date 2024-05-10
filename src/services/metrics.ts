/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { saveFileIntoDir } from './filesystem/filesystem';
import { gatherLighthouseMetrics } from './lighthouse/lighthouse';
import { Page } from 'puppeteer';

interface LighthouseMetrics {
	audits: {
		[metric: string]: LighthouseAudit
	};
}

interface LighthouseAudit {
	id: string;
	title: string;
	description: string;
	score: number;
	scoreDisplayMode: number;
	numericValue: number;
	displayValue: string;
	explanation: string;
}

export interface ProcessedLigthouseMetrics {
	metric: string;
	value: number;
}

export const getLighthouseMetricsAndSaveFile = async (directoryName: string, fileName: string, page: Page) => {
	const fileContent = await gatherLighthouseMetrics(page, 'html');
	await saveFileIntoDir(directoryName, fileName, fileContent);
};

export const getLighthouseMetrics = async (page: Page): Promise<ProcessedLigthouseMetrics[]> => {
	const lighthouseMetrics: LighthouseMetrics = JSON.parse(await gatherLighthouseMetrics(page, 'json'));

	const processedResult: ProcessedLigthouseMetrics[] =
		Object
			.entries(lighthouseMetrics.audits)
			.reduce((accumulator: ProcessedLigthouseMetrics[], currentValue: [string, LighthouseAudit]) => {
				return Array.from([...accumulator,
					{
						metric: currentValue[0],
						value : currentValue[1].numericValue
					}]);
			}, []);
	return processedResult;
};
