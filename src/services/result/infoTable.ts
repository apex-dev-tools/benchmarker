import { getTestInfoRecordThatAlreadyExist } from '../../database/testInfo';
import { TestInfo } from '../../database/entity/testInfo';
import { convertOutputToTestInfo, TestResultOutput } from './output';

export async function convertTestResultOutputToTestInfo(
  testResultOutput: TestResultOutput[]
): Promise<TestInfo[]> {
  // Extract flow-action pairs
  const flowActionPairs = testResultOutput.map(result => ({
    flowName: result.flowName,
    actionName: result.action,
  }));

  const recordsThatAlreadyExist =
    await getTestInfoRecordThatAlreadyExist(flowActionPairs);

  const testInfoResults = testResultOutput.map(item =>
    convertOutputToTestInfo(item, recordsThatAlreadyExist)
  );

  return testInfoResults;
}
