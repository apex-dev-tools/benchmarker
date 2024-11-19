/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { getDatabaseUrl } from '../shared/env';
import { OrgContext } from './org/context';
import {
  TestResultOutput,
  addAlertRecords,
  convertOutputToTestResult,
  getReporters,
} from './result/output';
import { save } from './result/save';

export async function reportResults(
  testResultOutput: TestResultOutput[],
  orgContext: OrgContext
): Promise<void> {
  const results = testResultOutput.map(convertOutputToTestResult);

  // run loggers
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
      const alerts = testResultOutput
        .filter(result => result.alertThresolds)
        .map(addAlertRecords);
      await save(results, orgContext, alerts);
    } catch (err) {
      console.error(
        'Failed to save results to database. Check DATABASE_URL environment variable, unset to skip saving.'
      );
      throw err;
    }
  }
}
