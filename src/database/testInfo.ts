/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { TestInfo } from './entity/testInfo';
import { getConnection } from './connection';

export async function saveTestInfoRecords(testStepResults: TestInfo[]) {
  const connection = await getConnection();
  return connection.manager.save(testStepResults);
}

export async function getTestInfoRecordThatAlreadyExist(
  flowActionPairs: { flowName: string; actionName: string }[]
) {
  const connection = await getConnection();

  // Generate the query for all flow-action pairs
  const flowActionConditions = flowActionPairs
    .map(pair => `('${pair.flowName}', '${pair.actionName}')`)
    .join(', ');

  const query = `
    SELECT
      id,
      flow_name,
      action
    FROM performance.test_info
    WHERE (flow_name, action) IN (${flowActionConditions})
  `;

  try {
    const result = await connection.query(query);

    const resultsMap: { [key: string]: number } = {};
    // Populate the results map
    result.forEach((row: { id: number; flow_name: string; action: string }) => {
      const key = `${row.flow_name}_${row.action}`;
      resultsMap[key] = row.id;
    });

    return resultsMap;
  } catch (error) {
    console.error('Error in existing records: ', error);
    return {};
  }
}
