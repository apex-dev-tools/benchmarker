/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { getDatabaseUrl } from '../shared/env';
import { OrgContext } from './org/context';
import {
  TestResultOutput,
  addAlertByComparingAvg,
  convertOutputToTestResult,
  getReporters,
} from './result/output';
import { save } from './result/save';
import { getAverageValues } from '../database/alertInfo';
import { shouldStoreAlerts, getRangeCollection } from '../shared/env';

export async function reportResults(
  testResultOutput: TestResultOutput[],
  orgContext: OrgContext
): Promise<void> {
  const results = testResultOutput.map(convertOutputToTestResult);

  // Extract flowName and actionName pairs from the test results
  const flowActionPairs = testResultOutput
    .filter(
      result =>
        !(
          result.alertThresolds && result.alertThresolds.storeAlerts === false
        ) && shouldStoreAlerts()
    ) // Only include those that have alert thresholds
    .map(result => ({ flowName: result.flowName, actionName: result.action }));

  // Fetch average values for all flow-action pairs
  const preFetchedAverages = await getAverageValues(flowActionPairs);
  const rangeCollection = getRangeCollection();

  // Run loggers
  for (const reporter of getReporters()) {
    try {
      await reporter.report(results);
    } catch (err) {
      if (err instanceof Error) {
        console.error(
          `Error running reporter '${reporter.name}': ${err.message}`
        );
      }
    }
  }

  if (getDatabaseUrl()) {
    try {
      // Generate alerts based on pre-fetched averages
      const alerts = await Promise.all(
        testResultOutput
          .filter(
            result =>
              !(
                result.alertThresolds &&
                result.alertThresolds.storeAlerts === false
              ) && shouldStoreAlerts()
          )
          .map(
            async item =>
              await addAlertByComparingAvg(
                item,
                preFetchedAverages,
                rangeCollection
              )
          )
      );

      await save(results, orgContext, alerts);
    } catch (err) {
      console.error(
        'Failed to save results to database. Check DATABASE_URL environment variable, unset to skip saving.'
      );
      throw err;
    }
  }
}
