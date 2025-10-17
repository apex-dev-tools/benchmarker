/** @ignore */
/**
 * Copyright (c) 2025 Certinia, Inc. All rights reserved.
 */
import { UiAlert } from './entity/uiAlert';
import { getConnection } from './connection';
import { UiTestResult } from './entity/uiTestResult';

export async function saveAlerts(
  testResultsDB: UiTestResult[],
  alerts: UiAlert[]
) {
  alerts.forEach(alert => {
    const match = testResultsDB.find(
      result =>
        result.testSuiteName === alert.testSuiteName &&
        result.individualTestName === alert.individualTestName
    );
    if (match) {
      alert.uiTestResultId = match.id;
    }
  });

  const connection = await getConnection();
  return connection.manager.save(alerts);
}

export async function getAverageLimitValuesFromDB(
  suiteAndTestNamePairs: { testSuiteName: string; individualTestName: string }[]
) {
  const connection = await getConnection();

  const suiteAndTestNameConditions = suiteAndTestNamePairs
    .map(pair => `('${pair.testSuiteName}', '${pair.individualTestName}')`)
    .join(', ');

  const query = `
    WITH ranked AS (
        SELECT
            test_suite_name,
            individual_test_name,
            component_load_time,
            create_date_time,
            ROW_NUMBER() OVER (
                PARTITION BY test_suite_name, individual_test_name
                ORDER BY create_date_time DESC
            ) AS rn
        FROM ui_test_result
        WHERE (create_date_time >= CURRENT_TIMESTAMP - INTERVAL '30 DAYS')
          AND (test_suite_name, individual_test_name) IN (${suiteAndTestNameConditions})
    )
    SELECT
        test_suite_name,
        individual_test_name,
        AVG(CASE WHEN rn BETWEEN 1 AND 5 THEN component_load_time END) AS avg_first_5,
        AVG(CASE WHEN rn BETWEEN 6 AND 15 THEN component_load_time END) AS avg_next_10
    FROM ranked
    GROUP BY test_suite_name, individual_test_name
    HAVING COUNT(*) >= 15
  `;

  const resultsMap: {
    [key: string]: {
      avg_first_5: number;
      avg_next_10: number;
    };
  } = {};

  try {
    const result = await connection.query(query);

    // Populate the results map
    result.forEach(
      (row: {
        test_suite_name: string;
        individual_test_name: string;
        avg_first_5: number;
        avg_next_10: number;
      }) => {
        const key = `${row.test_suite_name}_${row.individual_test_name}`;
        resultsMap[key] = {
          avg_first_5: row.avg_first_5 ?? 0,
          avg_next_10: row.avg_next_10 ?? 0,
        };
      }
    );

    return resultsMap;
  } catch (error) {
    console.error('Error in fetching the average values: ', error);
    return {};
  }
}
