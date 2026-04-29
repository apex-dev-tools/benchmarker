/** @ignore */
/**
 * Copyright (c) 2025 Certinia, Inc. All rights reserved.
 */
import { getConnection } from './connection';
import { UiAlert } from './entity/uiAlert';
import { UiTestResult } from './entity/uiTestResult';

export type SuiteTestLwsPair = {
  testSuiteName: string;
  individualTestName: string;
  lwsEnabled: boolean;
};

const KEY_DELIMITER = '_';
const MIN_BASELINE_COUNT = 10;

export function buildKey(
  suiteName: string,
  testName: string,
  lwsEnabled: boolean
): string {
  return `${suiteName}${KEY_DELIMITER}${testName}${KEY_DELIMITER}${lwsEnabled}`;
}

/**
 * Builds a parameterized SQL IN clause for (test_suite_name, individual_test_name, lws_enabled) tuples.
 * Returns the SQL fragment and a flat array of parameter values.
 *
 * Example output for 2 pairs starting at offset 0:
 *   sql:    "($1, $2, $3), ($4, $5, $6)"
 *   params: ["suite1", "test1", false, "suite2", "test2", true]
 */
function buildTupleParams(
  pairs: SuiteTestLwsPair[],
  startIndex = 1
): { sql: string; params: (string | boolean)[] } {
  const params: (string | boolean)[] = [];
  const tuples: string[] = [];
  let idx = startIndex;

  for (const pair of pairs) {
    tuples.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
    params.push(pair.testSuiteName, pair.individualTestName, pair.lwsEnabled);
    idx += 3;
  }

  return { sql: tuples.join(', '), params };
}

export async function saveAlerts(
  testResultsDB: UiTestResult[],
  alerts: UiAlert[]
) {
  alerts.forEach(alert => {
    const match = testResultsDB.find(
      result =>
        result.testSuiteName === alert.testSuiteName &&
        result.individualTestName === alert.individualTestName &&
        result.lwsEnabled === alert.lwsEnabled
    );
    if (match) {
      alert.uiTestResultId = match.id;
    }
  });

  const connection = await getConnection();
  return connection.manager.save(alerts);
}

export async function getAverageLimitValuesFromDB(
  suiteAndTestNamePairs: SuiteTestLwsPair[]
) {
  if (suiteAndTestNamePairs.length === 0) {
    return {};
  }
  const connection = await getConnection();
  return fetchRollingAverages(connection, suiteAndTestNamePairs);
}

async function fetchRollingAverages(
  connection: any,
  pairs: SuiteTestLwsPair[]
): Promise<{
  [key: string]: {
    avg_load_time_past_5_days: number | null;
    avg_load_time_6_to_15_days_ago: number | null;
  };
}> {
  const { sql: tuplesSql, params } = buildTupleParams(pairs);
  // HAVING ensures at least MIN_BASELINE_COUNT runs exist in the 6-to-15-day
  // window before we trust the baseline average. Without this guard a single
  // old data-point (or a gap in runs) produces a NULL/zero baseline that makes
  // every recent result look like a regression.
  const avgQuery = `
    SELECT
      individual_test_name,
      test_suite_name,
      lws_enabled,
      ROUND(AVG(CASE
          WHEN create_date_time >= CURRENT_TIMESTAMP - INTERVAL '5 days'
          THEN component_load_time
          ELSE NULL
      END)::numeric, 0) AS avg_load_time_past_5_days,
      ROUND(AVG(CASE
          WHEN create_date_time >= CURRENT_TIMESTAMP - INTERVAL '15 days'
              AND create_date_time < CURRENT_TIMESTAMP - INTERVAL '5 days'
          THEN component_load_time
          ELSE NULL
      END)::numeric, 0) AS avg_load_time_6_to_15_days_ago
    FROM performance.ui_test_result
    WHERE (test_suite_name, individual_test_name, lws_enabled) IN (${tuplesSql})
      AND create_date_time >= CURRENT_TIMESTAMP - INTERVAL '15 days'
    GROUP BY individual_test_name, test_suite_name, lws_enabled
    HAVING COUNT(CASE
        WHEN create_date_time >= CURRENT_TIMESTAMP - INTERVAL '15 days'
            AND create_date_time < CURRENT_TIMESTAMP - INTERVAL '5 days'
        THEN 1
        ELSE NULL
    END) >= ${MIN_BASELINE_COUNT}
    ORDER BY individual_test_name;
  `;
  const resultsMap: {
    [key: string]: {
      avg_load_time_past_5_days: number | null;
      avg_load_time_6_to_15_days_ago: number | null;
    };
  } = {};

  try {
    const rows = await connection.query(avgQuery, params);
    for (const row of rows ?? []) {
      const key = buildKey(
        row.test_suite_name,
        row.individual_test_name,
        row.lws_enabled
      );
      resultsMap[key] = {
        avg_load_time_past_5_days: row.avg_load_time_past_5_days ?? null,
        avg_load_time_6_to_15_days_ago:
          row.avg_load_time_6_to_15_days_ago ?? null,
      };
    }
    return resultsMap;
  } catch (error) {
    console.error('Error in fetching the average values: ', error);
    return {};
  }
}

export async function checkRecentUiAlerts(
  suiteAndTestNamePairs: SuiteTestLwsPair[]
) {
  const connection = await getConnection();
  const { sql: tuplesSql, params } = buildTupleParams(suiteAndTestNamePairs);

  const query = `
    SELECT test_suite_name, individual_test_name, lws_enabled
    FROM performance.ui_alert
    WHERE create_date_time >= CURRENT_TIMESTAMP - INTERVAL '3 days'
      AND (test_suite_name, individual_test_name, lws_enabled) IN (${tuplesSql})
  `;

  const existingAlerts = new Set<string>();

  try {
    const result = await connection.query(query, params);
    result.forEach(
      (row: {
        test_suite_name: string;
        individual_test_name: string;
        lws_enabled: boolean;
      }) => {
        existingAlerts.add(
          buildKey(
            row.test_suite_name,
            row.individual_test_name,
            row.lws_enabled
          )
        );
      }
    );
  } catch (error) {
    console.error('Error checking recent UI alerts:', error);
  }

  return existingAlerts;
}
