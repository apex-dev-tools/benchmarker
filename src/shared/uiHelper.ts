/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { INavigate } from '../services/navigate';
import { Page, ElementHandle } from 'puppeteer';
// check comment in func retryMaxAttempsWithDelay to understand this import
import * as common from './uiHelper';
import { FormLoadTestTemplate } from '../testTemplates/formLoadTestTemplate';

export interface TestPerformanceErrorI {
  message: string;
  exception?: string;
}

/** @ignore */
export function retryMaxAttempsWithDelay<T>(
  workToDo: () => Promise<T>,
  delayMillis: number,
  maxAttempts: number,
  attempts: number = 0
): Promise<T> {
  return new Promise<T>(async (resolve, reject) => {
    try {
      resolve(await workToDo());
    } catch (err) {
      attempts += 1;
      if (attempts < maxAttempts) {
        await delay(delayMillis);
        try {
          // The class call itself through the module (same module) for the testing sake.
          // sinon can not spy a recursive function if it calls itself directly
          resolve(
            await common.retryMaxAttempsWithDelay(
              workToDo,
              delayMillis,
              maxAttempts,
              attempts
            )
          );
        } catch (err) {
          reject(err);
        }
      } else {
        reject({
          message: 'Max attempts reached',
          exception: err,
        } as TestPerformanceErrorI);
      }
    }
  });
}

/**
 * Searches for element to be present in DOM
 * @param frame page frame to search for the selector
 * @param selector element to wait for
 * @param visible determines whether the element is visible
 * @param timeout maximum time to wait for in milliseconds
 * @example
 * 	```typescript
 * const test: FormLoadTestTemplate = new FormLoadTestTemplate({product: 'Product Name'});
 * const page = test.page;
 * const frame = await test.navigator.getVfFrame({ page });
 * await searchSelector(frame, 'a[data-ffid="autoMatchButton"]', true, 20000);
 * ```
 */
export async function searchSelector(
  frame: Page,
  selector: string,
  visible: boolean,
  timeout: number
) {
  const selectorToWait = () =>
    new Promise<ElementHandle>(async (resolve, reject) => {
      try {
        const element = await frame.waitForSelector(selector, {
          visible,
          timeout,
        });
        if (element) {
          resolve(element);
        } else {
          reject(`Selector not found ${selector}`);
        }
      } catch (e) {
        reject(`Selector not found ${selector}`);
      }
    });
  return await retryMaxAttempsWithDelay(selectorToWait, 300, 10);
}

/**
 * Waits for a spinner to appear & dissapear
 *
 * @param page object that provides methods to interact with a single tab in Chromium
 * @param timeoutToWait maximum time to wait for in milliseconds
 * @example
 *  ```typescript
 * const test: FormLoadTestTemplate = new FormLoadTestTemplate({product: 'Product Name'});
 * const page = test.page;
 * await switchView(page, 20000);
 * //wait for element after spinners disapear
 * await page.waitForSelector('tr th a[data-refid="recordId"]', {visible: true, });
 * ```
 */
export async function switchView(page: Page, timeoutToWait: number) {
  await page.waitForSelector(
    'div div div div div div[class="slds-spinner slds-spinner--medium slds-spinner--brand"]',
    { visible: true, timeout: timeoutToWait }
  );
  await page.waitForSelector(
    'div div div div div div[class="slds-spinner slds-spinner--medium slds-spinner--brand"]',
    { visible: false, timeout: timeoutToWait }
  );
  await delay(3000);
}

/**
 * Waits to page/tab/button to appear
 *
 * @param frontdoorUrl URL to direct users to an authorization endpoint for a provided Org
 * @param navigator object that provide functionality to navigate between URLs
 * @param page object that provides methods to interact with a single tab in Chromium
 * @example
 *  ```typescript
 * const test: FormLoadTestTemplate = new FormLoadTestTemplate({product: 'Product Name'});
 * const page = test.page;
 * await retryWaitToHomePage(test.frontdoorUrl, test.navigator, page);
 * ```
 */
export async function retryWaitToHomePage(
  frontdoorUrl: string,
  navigator: INavigate,
  page: Page
) {
  await retryMaxAttempsWithDelay(
    async () => await waitToFrontdoor(frontdoorUrl, page, navigator),
    3000,
    3
  );
}

/**
 * Waits to page/tab/button to appear
 *
 * @param test object with the information required to execute a test
 * @param page object that provides methods to interact with a single tab in Chromium
 * @param pageName name of page to perfroms the action
 * @param [pageAttribute] optional selector to wait to appear in page
 * @example
 *  ```typescript
 * const test: FormLoadTestTemplate = new FormLoadTestTemplate({product: 'Product Name'});
 * const page = test.page;
 * const selectPageElement: ElementHandle = await retryWaitToPageTabButton(test, page, 'Page Name', '[href*="PageName"]');
 * ```
 */
export async function retryWaitToPageTabButton(
  test: FormLoadTestTemplate,
  page: Page,
  pageName: string,
  pageAttribute?: string
) {
  return await retryMaxAttempsWithDelay(
    async () =>
      await test.navigator.goToAllTabsTab({ page }, pageName, pageAttribute),
    3000,
    3
  );
}

/**
 * Adds a time delay given a number of milliseconds
 *
 * @param time maximum time to delay in milliseconds
 */
export function delay(time: number): Promise<void> {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve();
    }, time)
  );
}

async function waitToFrontdoor(
  frontdoorUrl: string,
  page: Page,
  navigator: INavigate
) {
  await navigator.goToFrontdoor({ doNavigate: false, page }, frontdoorUrl);

  // Accept when asked 'Are you sure you want to leave' on leaving the page
  // Fix me, PER-1500 (pending to define a behaviour when is giving an exception)
  page.on('dialog', async (dialog: any) => {
    // tslint:disable-next-line: no-empty
    try {
      await dialog.accept();
    } catch (e) {
      //
    }
  });
  await navigator.homeIsLoaded({ page });
}
