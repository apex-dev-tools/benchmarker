/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import fs from 'fs';
import path from 'path';

import { PuppeteerNodeLaunchOptions } from 'puppeteer';

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || '';
}

export function isDebug() {
  return process.env.NODE_ENV === 'debug';
}

export function isHeadless() {
  return process.env.HEADLESS === 'true';
}

export function shouldStoreAlerts() {
  return process.env.STORE_ALERTS === 'true';
}

/**
 * Load the range collection from either a custom JSON path or default json file.
 */
export function getRangeCollection(): any {
  const customRangesPath = process.env.CUSTOM_RANGES_PATH;
  const defaultRangesPath = path.resolve(__dirname, '../../rangeConfig.json');

  let ranges = {};

  if (customRangesPath) {
    try {
      const customRanges = fs.readFileSync(customRangesPath, 'utf8');
      ranges = JSON.parse(customRanges);
    } catch (error) {
      console.error(error);
    }
  }

  if (Object.keys(ranges).length === 0) {
    const defaultRanges = fs.readFileSync(defaultRangesPath, 'utf8');
    ranges = JSON.parse(defaultRanges);
  }
  return ranges;
}

export function getPuppeteerLaunchOptions(
  headless?: boolean
): PuppeteerNodeLaunchOptions {
  return {
    args: [
      // Improves headless performance: https://github.com/GoogleChrome/puppeteer/issues/1718
      "--proxy-server='direct://'",
      '--proxy-bypass-list=*',
      // Needed on Heroku https://github.com/jontewks/puppeteer-heroku-buildpack
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      // Needed to solve the memory overrun in Heroku
      '--disable-dev-shm-usage',
    ],
    headless,
    slowMo: 100,
    timeout: 0,
  };
}

export function getIsIncognitoBrowser() {
  return process.env.INCOGNITO_BROWSER === 'true';
}

export function getLighthouseHTMLReport(): boolean {
  return (
    process.env.LIGHTHOUSE_HTML_REPORT === undefined ||
    process.env.LIGHTHOUSE_HTML_REPORT === 'true'
  );
}

export function getLighthouseEnabled(): boolean {
  return process.env.LIGHTHOUSE_ENABLED === 'true';
}

export function getLinesInitial() {
  return process.env.LINES_INITIAL || '-1';
}

export function getLinesMaximum() {
  return process.env.LINES_MAXIMUM || '-1';
}

export function getLinesIteration() {
  return process.env.LINES_ITERATION || '-1';
}

export function getDocumentsInitial() {
  return process.env.DOCUMENTS_INITIAL || '-1';
}

export function getDocumentsMaximum() {
  return process.env.DOCUMENTS_MAXIMUM || '-1';
}

export function getDocumentsIteration() {
  return process.env.DOCUMENTS_ITERATION || '-1';
}

export function getUnmanagePackages() {
  return process.env.UNMANAGE_PACKAGE?.split(',') || [];
}

export function getAsyncMonitorTimeout() {
  return process.env.ASYNC_MONITOR_TIMEOUT || '60';
}

export function getExternalBuildId() {
  return process.env.EXTERNAL_BUILD_ID || '';
}

export function getAppLauncherSelector() {
  return (
    process.env.APP_LAUNCHER_SELECTOR ||
    '.appLauncher > one-app-launcher-header'
  );
}

export function getAppLanucherAllTabsSelector() {
  return (
    process.env.APP_LAUNCHER_ALL_TABS_SELECTOR ||
    'one-app-launcher-menu > div > lightning-button[class*="button"]'
  );
}

export function getAppLauncherTabSelector(
  tabName: string,
  tabAttribute: string
) {
  return (
    process.env.APP_LAUNCHER_ALL_TABS_SELECTOR?.replace(
      '$tabName',
      tabName
    ).replace('$tabAttribute', tabAttribute) ||
    `one-app-launcher-tab-item a[data-label="${tabName}"]${tabAttribute}`
  );
}
