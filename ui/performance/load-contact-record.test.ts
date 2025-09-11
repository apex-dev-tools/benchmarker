/**
 * @copyright 2025 Certinia Inc. All rights reserved.
 */

import type { EventEmitter, ScenarioContext } from 'artillery';
import dotenv from 'dotenv';
import type { Page } from '@playwright/test';

import {
  gotoSF,
  logIn,
  getCurrentTestFileName,
  stepErrorCapture,
  type ArtilleryTest,
} from './utils';
import { defaultConfig } from './artillery';

dotenv.config({ path: 'autotests/ui/.env' });

const { DEBUG, SALESFORCE_URL } = process.env;

const CURRENT_TEST_FILE_NAME = getCurrentTestFileName(__filename);

export const config = defaultConfig({
  target: SALESFORCE_URL,
  engines: {
    playwright: {
      launchOptions: {
        headless: !DEBUG,
      },
    },
  },
  phases: [
    {
      duration: '15s', // Very short test duration
      arrivalRate: 1,
      maxVusers: 1,
    },
  ],
});

export const scenarios = [
  {
    engine: 'playwright',
    testFunction: simpleTest,
  },
];

async function simpleTest(
  page: Page,
  vuContext: ScenarioContext,
  events: EventEmitter,
  test: ArtilleryTest
) {
  const overallStart = Date.now();
  let salesforceLoadTime = 0;
  let componentLoadTime = 0;

  // Login and org opening (Salesforce authentication + org access)
  await test.step('login_and_org_access', async () => {
    const start = Date.now();
    await stepErrorCapture(
      'login_and_org_access',
      CURRENT_TEST_FILE_NAME,
      async () => {
        console.log('Starting login and org access...');
        await gotoSF(page, events, async () => {
          await logIn(page);

          // Navigate to Lightning home after login
          const { ACCESS_TOKEN } = process.env;
          if (!ACCESS_TOKEN) {
            throw new Error('ACCESS_TOKEN environment variable is required');
          }
          await page.goto(
            `/secur/frontdoor.jsp?sid=${ACCESS_TOKEN}&retURL=lightning/page/home`,
            { waitUntil: 'load', timeout: 30000 }
          );
          // Wait for Lightning to load
          try {
            await page.waitForSelector(
              'div.slds-scope, .oneHeader, .slds-global-header, .navexConsoleTabContainer, .windowViewMode-normal',
              { timeout: 10000 }
            );
          } catch (error) {
            await page.waitForSelector('div', { timeout: 5000 });
          }
        });
        console.log('Login and org access completed');
      }
    );
    salesforceLoadTime = Date.now() - start;
  });

  // Contact record loading (Component loading)
  await test.step('contact_record_load', async () => {
    const start = Date.now();
    await stepErrorCapture(
      'contact_record_load',
      CURRENT_TEST_FILE_NAME,
      async () => {
        console.log('Starting contact record load...');

        // Navigate to Contacts tab
        await page.goto('/lightning/o/Contact/list?filterName=Recent', {
          waitUntil: 'load',
          timeout: 30000,
        });

        // Wait for the contacts list to load
        await page.waitForSelector(
          'table[role="grid"] tbody tr:first-child, .slds-table tbody tr:first-child, .listViewTable tbody tr:first-child, tbody tr:first-child',
          { timeout: 15000 }
        );

        // Just load first contact in list
        const firstContactLink = await page.$(
          'table[role="grid"] tbody tr:first-child a, .slds-table tbody tr:first-child a, .listViewTable tbody tr:first-child a, tbody tr:first-child a'
        );

        if (firstContactLink) {
          await firstContactLink.click();
          // Wait for the contact record page to load
          await page.waitForSelector(
            '.record-header, .slds-page-header, .forceDetailPanelDesktop, [data-record-page-component] ',
            { timeout: 15000 }
          );
        } else {
          throw new Error('No contact records found in the list');
        }

        console.log('Contact record load completed');
      }
    );
    componentLoadTime = Date.now() - start;
  });

  const totalOverallLoadTime = Date.now() - overallStart;

  // Write results to JSON
  const performanceData = {
    aggregate: {
      summaries: {
        'browser.step.contact_performance_test': {
          salesforceLoadTime,
          componentLoadTime,
          overallLoadTime: totalOverallLoadTime,
          testSuiteName: 'Contact Record Load Test Suite',
          individualTestName: 'Contact Record Performance Test',
        },
      },
    },
  };

  require('fs').writeFileSync(
    '/tmp/ui-performance-results.json',
    JSON.stringify(performanceData, null, 2)
  );

  console.log('Test completed successfully');
}
