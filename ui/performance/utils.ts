/*
 * @copyright 2025 Certinia Inc. All rights reserved.
 */

import * as childProcess from 'child_process';
import { readFile, rm, writeFile, mkdir } from 'fs/promises';
import { basename, join, parse } from 'path';
import { promisify } from 'util';
import { Page, expect as baseExpect, test } from '@playwright/test';
import type { EventEmitter } from 'artillery';

interface ICustomLoggingError extends Error {
  stackTrace?: string;
}

type CustomLogging = {
  testStep: Record<string, { errors: ICustomLoggingError[] }>;
};

const customLogging: CustomLogging = {
  testStep: {},
};
const errorLogDirectory = join('autotests', 'ui', 'performance', 'errorLogs');

// Set timeout for expectations to 3 minutes
const expect = baseExpect.configure({ timeout: 60000 });

/**
 * An Artillery test step that defines a single action to be performed during the test.
 * This is used to structure the test scenarios and can include actions like logging in, navigating to a page, etc.
 * Each step is a function that takes a step name and a function to execute, allowing for structured logging and error handling.
 */
export type ArtilleryTest = typeof test;

/**
 * An entry in the browser's local storage.
 */
export type LocalStorageEntry = {
  /**
   * Local storage key (appended to 'LSKey[pse]').
   */
  key: string;

  /**
   * Local storage value (serialized to JSON).
   */
  value: unknown;
};

/**
 * Sets the given key and value in the browser's local storage.
 *
 * @param page - Handle to PlayWright's page context.
 * @param entry - Local storage entry to set.
 */
export async function setLocalStorage(page: Page, entry: LocalStorageEntry) {
  await page.evaluate<void, LocalStorageEntry>((entry: LocalStorageEntry) => {
    const { key, value } = entry;
    localStorage.setItem(`LSKey[pse]${key}`, JSON.stringify(value));
  }, entry);
}

/**
 * Gets a single record of the provided type using the provided WHERE clause.
 *
 * @param sObjectType - SObject type to get record for.
 * @param whereClause - WHERE clause to use when filtering records.
 * @returns The fetched record.
 */
export async function getRecord(sObjectType: string, whereClause: string) {
  const getRecordCmd = `sf data get record --sobject ${sObjectType} --where "${whereClause}" --json`;

  const exec = promisify(childProcess.exec);

  const { stderr, stdout } = await exec(getRecordCmd, { cwd: __dirname });

  if (stderr) {
    throw new Error(stderr);
  } else {
    const response = JSON.parse(stdout);
    const { result, status } = response;

    if (status === 0) {
      return result;
    }
  }

  throw new Error(`Failed to find ${sObjectType} where ${whereClause}`);
}

/**
 * Deletes a single record of the provided type using the provided WHERE clause.
 *
 * @param sObjectType - SObject type to delete record for.
 * @param whereClause - WHERE clause to use when filtering records.
 * @returns The fetched record.
 */
export async function deleteRecord(sObjectType: string, whereClause: string) {
  const deleteRecordCmd = `sf data delete record --sobject ${sObjectType} --where "${whereClause}" --json`;

  const exec = promisify(childProcess.exec);

  const { stderr, stdout } = await exec(deleteRecordCmd, { cwd: __dirname });

  if (stderr) {
    throw new Error(stderr);
  } else {
    const response = JSON.parse(stdout);
    const { result, status } = response;

    if (status !== 0) {
      throw new Error(
        `Failed to delete ${sObjectType} where ${whereClause}: ${result.message}`
      );
    }
  }
}

/**
 * Inserts a record of the provided type with the provided field values.
 *
 * @param sObjectType - SObject type to create record for.
 * @param fieldValues - Field values to set on record.
 */
export async function insertRecord(
  sObjectType: string,
  fieldValues: Map<string, string>
) {
  const tempFile = join(__dirname, 'temp.apex');
  let anonApex = `insert new ${sObjectType}(`;

  for (const [key, value] of fieldValues) {
    anonApex += `${key} = ${value},`;
  }
  anonApex = anonApex.substring(0, anonApex.length - 1);
  anonApex += ');';

  await writeFile(tempFile, anonApex);

  const runApexCmd = `sf apex run --file ${tempFile} --json`;

  const exec = promisify(childProcess.exec);

  const { stderr, stdout } = await exec(runApexCmd, { cwd: __dirname });

  if (stderr) {
    throw new Error(stderr);
  } else {
    const response = JSON.parse(stdout);
    const { result, status } = response;

    if (status === 0 && !result.success) {
      throw new Error(
        `Error: ${response.exceptionMessage} stack trace: ${response.exceptionStackTrace}`
      );
    }
  }

  await rm(tempFile, { force: true });
}

/**
 * Get file name for the current test run without its extension.
 *
 * @param currentFilePath - The path of the current test file.
 * @returns The file name without its extension.
 *
 * e.g. If the current file path is 'load-work-planner-allocation-view-by-project-in-months.test.ts.js'
 * (the js extension is added when running the test as typescript compiles to javascript),
 * it will return 'load-work-planner-allocation-view-by-project-in-months'.
 */
export function getCurrentTestFileName(currentFilePath: string): string {
  const baseName: string = basename(currentFilePath);

  const fileNameWithoutJsExtension: string = parse(baseName).name;
  const fileNameWithoutExtension: string = fileNameWithoutJsExtension.replace(
    /(\.test)?\.[^/.]+$/,
    ''
  );

  return fileNameWithoutExtension;
}

/**
 * Writes the errors to a file. These error files are then archived via the Performance UI pipeline to help us diagnose failures more easily.
 *
 * @param currentFileName - The name of the test file being run.
 * @param testStepName - The name of the test step that failed.
 * @param error - The error that occurred.
 *
 * @returns Writes the error to a file.
 */
async function handleErrors(
  currentFileName: string,
  testStepName: string,
  error: Error
) {
  const errorFileName = `${currentFileName}-errors.json`;

  const filePath = join(errorLogDirectory, errorFileName);

  try {
    const currentCustomLogging = await readFile(filePath, 'utf8');

    Object.assign(customLogging, JSON.parse(currentCustomLogging));
  } catch (err) {
    // Nothing to do here as file has not been created yet
  }

  if (!customLogging.testStep[testStepName]) {
    customLogging.testStep[testStepName] = { errors: [] };
  }

  const customLoggingError: ICustomLoggingError = error;
  customLoggingError.stackTrace = error.stack;

  customLogging.testStep[testStepName].errors.push(customLoggingError);

  try {
    await mkdir(errorLogDirectory);
  } catch (err) {
    // directory has already been created
  }

  await writeFile(filePath, JSON.stringify(customLogging, undefined, 2));
}

/**
 * Logs in to the application using a provided access token and navigates to the Lightning page.
 *
 * Navigates the given Playwright `page` to the Salesforce frontdoor URL using the `ACCESS_TOKEN`
 * from environment variables, then waits for the App Launcher to be visible to confirm login.
 *
 * @param page - The Playwright Page object to perform actions on.
 * @param timeout - Optional timeout in milliseconds for navigation and visibility checks (default: 60000 ms).
 * @throws Will throw an error if the App Launcher is not visible within the specified timeout.
 */
export async function logIn(page: Page, timeout = 60_000) {
  const { ACCESS_TOKEN } = process.env;
  await page.goto(`/secur/frontdoor.jsp?sid=${ACCESS_TOKEN}&retURL=lightning`, {
    waitUntil: 'load',
  });
  await expect(page.getByTitle('App Launcher')).toBeVisible({ timeout });
}

/**
 * Navigates to Salesforce using the provided Playwright page and executes a given async function.
 * If an error occurs and the environment is Jenkins CI, retries the function if the seasonal loading bug is detected.
 * Emits a counter event for retries and handles the visibility of the seasonal loading container.
 *
 * @template T - The return type of the async function to execute.
 * @param page - The Playwright Page object to perform actions on.
 * @param events - The Artillery EventEmitter for emitting custom events.
 * @param fn - An async function to execute after navigation.
 * @returns A promise that resolves with the result of the async function.
 * @throws Rethrows the error if not running in Jenkins CI or if the error is not related to the seasonal loading bug.
 */
export async function gotoSF<T>(
  page: Page,
  events: EventEmitter,
  fn: () => Promise<T>
) {
  try {
    await fn();
  } catch (error) {
    // Only retry if running in Jenkins CI
    const isJenkins = !!process.env.JENKINS_HOME || !!process.env.JENKINS_URL;
    if (!isJenkins) {
      throw error;
    }

    // Retry if .seasonal-container is still visible after another 30s.
    const seasonalLoadLocator = page.locator('div.seasonal-container');
    const isVisible = await seasonalLoadLocator.isVisible({ timeout: 0 });
    if (!isVisible) {
      // If the error is not related to the loading bug rethrow it
      throw error;
    }

    const isStillVisible = await seasonalLoadLocator.isVisible({
      timeout: 120_000,
    });
    if (isStillVisible) {
      process.stdout.write('SF Seasonal loading bug detected, retrying...');
      events.emit('counter', 'sf.load_retries', 1);

      await fn();
    }
    //If the code get here the SF Seasonal container was visible, but it disappeared before retrying (within 30s) so just keep going.
  }
}

/**
 * Executes a promise and captures any errors, logging them to a file associated with the test step and file name.
 *
 * @param testStepName - The name of the test step being executed.
 * @param testFileName - The name of the test file being run.
 * @param promise - A function to execute.
 */
export async function stepErrorCapture(
  testStepName: string,
  testFileName: string,
  promise: () => Promise<void>
) {
  try {
    await promise();
  } catch (e) {
    const error = e as Error;
    await handleErrors(testFileName, testStepName, error);
    throw new Error(`Failed on step ${testStepName}: ${error.message}`);
  }
}
