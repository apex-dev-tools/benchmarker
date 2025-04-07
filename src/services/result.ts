/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { getDatabaseUrl } from '../shared/env';
import { TestResultOutput } from './result/output';
import { save } from './result/save';
import { generateValidAlerts } from './result/alert';
import { Connection } from '@salesforce/core';
import { getOrgContext } from './org';
import { TableReporter } from './result/table';

export async function reportResults(
  connection: Connection,
  output: TestResultOutput[]
): Promise<void> {
  const results = output.map(r => r.result);
  const reporter = new TableReporter();

  try {
    await reporter.report(results);
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        `Error running reporter '${reporter.name}': ${err.message}`
      );
    }
  }

  if (getDatabaseUrl()) {
    try {
      const orgContext = await getOrgContext(connection);
      const validAlerts = await generateValidAlerts(output);
      await save(results, orgContext, validAlerts);
    } catch (err) {
      console.error(
        'Failed to save results to database. Check DATABASE_URL environment variable, unset to skip saving.'
      );
      throw err;
    }
  }
}
