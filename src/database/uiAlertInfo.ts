/** @ignore */
/**
 * Copyright (c) 2025 Certinia, Inc. All rights reserved.
 */
import { getConnection } from './connection';
import { UiAlert } from './entity/uiAlert';
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

  const countQuery = `
    SELECT individual_test_name,
      	COUNT(create_date_time) AS count_older_than_15_days
      FROM performance.ui_test_result
      WHERE create_date_time <= CURRENT_DATE - INTERVAL '15 days'
      GROUP BY individual_test_name
  `;

  const countResultMap: {
    [key: string]: { count_older_than_15_days: number };
  } = {};
  try {
    const countResult = await connection.query(countQuery);
    countResult.forEach(
      (row: {
        individual_test_name: string;
        count_older_than_15_days: number;
      }) => {
        countResultMap[row.individual_test_name] = {
          count_older_than_15_days: row.count_older_than_15_days,
        };
      }
    );
  } catch (error) {
    console.error('Error in fetching the count values: ', error);
    return {};
  }

  const suiteAndTestNameConditions = suiteAndTestNamePairs
    .flatMap(pair => {
      if (
        countResultMap[pair.individualTestName]?.count_older_than_15_days > 0
      ) {
        return [`('${pair.testSuiteName}', '${pair.individualTestName}')`];
      }
      return [];
    })
    .join(', ');

  if (suiteAndTestNameConditions.length === 0) {
    return {};
  }

  const avgQuery = `
    SELECT 
      individual_test_name,
      test_suite_name,
      AVG(CASE 
          WHEN create_date_time >= CURRENT_DATE - INTERVAL '5 days' 
          THEN component_load_time 
          ELSE NULL 
      END) AS avg_load_time_past_5_days,
      AVG(CASE 
          WHEN create_date_time >= CURRENT_DATE - INTERVAL '15 days' 
              AND create_date_time < CURRENT_DATE - INTERVAL '5 days' 
          THEN component_load_time 
          ELSE NULL 
      END) AS avg_load_time_6_to_15_days_ago
    FROM performance.ui_test_result
    WHERE create_date_time >= CURRENT_DATE - INTERVAL '15 days'
      AND (test_suite_name, individual_test_name) IN (${suiteAndTestNameConditions})
    GROUP BY individual_test_name, test_suite_name
    ORDER BY individual_test_name;
  `;

  const resultsMap: {
    [key: string]: {
      avg_load_time_past_5_days: number;
      avg_load_time_6_to_15_days_ago: number;
    };
  } = {};

  try {
    const result = await connection.query(avgQuery);

    // Populate the results map
    result.forEach(
      (row: {
        test_suite_name: string;
        individual_test_name: string;
        avg_load_time_past_5_days: number;
        avg_load_time_6_to_15_days_ago: number;
      }) => {
        const key = `${row.test_suite_name}_${row.individual_test_name}`;
        resultsMap[key] = {
          avg_load_time_past_5_days: row.avg_load_time_past_5_days ?? 0,
          avg_load_time_6_to_15_days_ago:
            row.avg_load_time_6_to_15_days_ago ?? 0,
        };
      }
    );

    return resultsMap;
  } catch (error) {
    console.error('Error in fetching the average values: ', error);
    return {};
  }
}
