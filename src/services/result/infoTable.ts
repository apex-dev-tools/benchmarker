/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { getTestInfoRecordThatAlreadyExist } from '../../database/testInfo';
import { TestInfo } from '../../database/entity/testInfo';
import { convertOutputToTestInfo, TestResultOutput } from './output';

export async function convertTestResultOutputToTestInfo(
  testResultOutput: TestResultOutput[]
): Promise<TestInfo[]> {
  try {
    // Extract flow-action pairs
    const flowActionPairs = testResultOutput.map(result => ({
      flowName: result.flowName,
      actionName: result.action,
    }));

    const recordsThatAlreadyExist =
      await getTestInfoRecordThatAlreadyExist(flowActionPairs);

    const testInfoResults = await Promise.all(
      testResultOutput.map(async item =>
        convertOutputToTestInfo(
          item,
          recordsThatAlreadyExist as Map<string, number>
        )
      )
    );

    return testInfoResults;
  } catch (err) {
    console.error('Error :', err);
    return [];
  }
}
