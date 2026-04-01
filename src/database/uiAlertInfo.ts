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
  const connection = await getConnection();

  const countResultMap = await fetchHistoryCounts(connection);
  if (!countResultMap || Object.keys(countResultMap).length === 0) {
    return {};
  }

  const pairsWithHistory = suiteAndTestNamePairs.filter(pair => {
    const countKey = buildKey(
      pair.testSuiteName,
      pair.individualTestName,
      pair.lwsEnabled
    );
    return countResultMap[countKey]?.count_older_than_15_days > 0;
  });

  if (pairsWithHistory.length === 0) {
    return {};
  }

  return fetchRollingAverages(connection, pairsWithHistory);
}

async function fetchHistoryCounts(
  connection: any
): Promise<{ [key: string]: { count_older_than_15_days: number } } | null> {
  const countQuery = `
    SELECT individual_test_name, lws_enabled, test_suite_name,
      COUNT(create_date_time) AS count_older_than_15_days
    FROM performance.ui_test_result
    WHERE create_date_time <= CURRENT_DATE - INTERVAL '15 days'
    GROUP BY individual_test_name, lws_enabled, test_suite_name
  `;
  try {
    const rows = await connection.query(countQuery);
    const map: { [key: string]: { count_older_than_15_days: number } } = {};
    for (const row of rows) {
      const key = buildKey(
        row.test_suite_name,
        row.individual_test_name,
        row.lws_enabled
      );
      map[key] = { count_older_than_15_days: row.count_older_than_15_days };
    }
    return map;
  } catch (error) {
    console.error('Error in fetching the count values: ', error);
    return {};
  }
}

async function fetchRollingAverages(
  connection: any,
  pairs: SuiteTestLwsPair[]
): Promise<{
  [key: string]: {
    avg_load_time_past_5_days: number;
    avg_load_time_6_to_15_days_ago: number;
  };
}> {
  const { sql: tuplesSql, params } = buildTupleParams(pairs);
  const avgQuery = `
    SELECT 
      individual_test_name,
      test_suite_name,
      lws_enabled,
      ROUND(AVG(CASE 
          WHEN create_date_time >= CURRENT_DATE - INTERVAL '5 days' 
          THEN component_load_time 
          ELSE NULL 
      END)::numeric, 0) AS avg_load_time_past_5_days,
      ROUND(AVG(CASE 
          WHEN create_date_time >= CURRENT_DATE - INTERVAL '15 days' 
              AND create_date_time < CURRENT_DATE - INTERVAL '5 days' 
          THEN component_load_time 
          ELSE NULL 
      END)::numeric, 0) AS avg_load_time_6_to_15_days_ago
    FROM performance.ui_test_result
    WHERE create_date_time >= CURRENT_DATE - INTERVAL '15 days'
    AND (test_suite_name, individual_test_name, lws_enabled) IN (${tuplesSql})
    GROUP BY individual_test_name, test_suite_name, lws_enabled
    ORDER BY individual_test_name;
  `;
  const resultsMap: {
    [key: string]: {
      avg_load_time_past_5_days: number;
      avg_load_time_6_to_15_days_ago: number;
    };
  } = {};

  try {
    const rows = await connection.query(avgQuery, params);
    for (const row of rows) {
      const key = buildKey(
        row.test_suite_name,
        row.individual_test_name,
        row.lws_enabled
      );
      resultsMap[key] = {
        avg_load_time_past_5_days: row.avg_load_time_past_5_days ?? 0,
        avg_load_time_6_to_15_days_ago: row.avg_load_time_6_to_15_days_ago ?? 0,
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
    WHERE create_date_time >= CURRENT_DATE - INTERVAL '3 days'
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
