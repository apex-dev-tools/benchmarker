/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Page } from 'puppeteer';
import { saveFileIntoDir } from './filesystem';
import { getIsIncognitoBrowser } from '../shared/env';

interface LighthouseMetrics {
  audits: {
    [metric: string]: LighthouseAudit;
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

export interface ProcessedLighthouseMetrics {
  metric: string;
  value: number;
}

// Lighthouse is ESM - duplicate of node_modules/lighthouse/core/index.cjs
// Unable to import types, and must be a const for stubbing
export const lighthouse = async (...args: any[]) =>
  (await import('lighthouse')).default(...args);

export async function getLighthouseMetricsAndSaveFile(
  directoryName: string,
  fileName: string,
  page: Page
) {
  const fileContent = await gatherLighthouseMetrics(page, 'html');
  await saveFileIntoDir(directoryName, fileName, fileContent);
}

export async function getLighthouseMetrics(
  page: Page
): Promise<ProcessedLighthouseMetrics[]> {
  const lighthouseMetrics: LighthouseMetrics = JSON.parse(
    await gatherLighthouseMetrics(page, 'json')
  );

  const processedResult: ProcessedLighthouseMetrics[] = Object.entries(
    lighthouseMetrics.audits
  ).reduce(
    (
      accumulator: ProcessedLighthouseMetrics[],
      currentValue: [string, LighthouseAudit]
    ) => {
      return Array.from([
        ...accumulator,
        {
          metric: currentValue[0],
          value: currentValue[1].numericValue,
        },
      ]);
    },
    []
  );
  return processedResult;
}

async function gatherLighthouseMetrics(
  page: Page,
  outputFormat: 'json' | 'html' | 'csv'
): Promise<string> {
  const port = page.browser().wsEndpoint().split(':')[2].split('/')[0];
  const config = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance'],
    },
  };

  return lighthouse(
    page.url(),
    {
      port: port ? parseInt(port) : undefined,
      output: outputFormat,
      formFactor: 'desktop',
      throttlingMethod: 'provided',
      disableStorageReset: !getIsIncognitoBrowser(),
    },
    config
  ).then((results: any) => {
    delete results.artifacts;
    return results.report;
  });
}
