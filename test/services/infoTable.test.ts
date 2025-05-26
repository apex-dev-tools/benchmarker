import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import { Timer } from '../../src/shared/timer';
import { convertTestResultOutputToTestInfo } from '../../src/services/result/infoTable';
import * as testInfoDb from '../../src/database/testInfo';
import { TestInfo } from '../../src/database/entity/testInfo';
import * as outputModule from '../../src/services/result/output';

describe('convertTestResultOutputToTestInfo', () => {
  let sandbox: sinon.SinonSandbox;
  let mockGetTestInfoRecordThatAlreadyExist: sinon.SinonStub;
  let mockConvertOutputToTestInfo: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockGetTestInfoRecordThatAlreadyExist = sandbox.stub(
      testInfoDb,
      'getTestInfoRecordThatAlreadyExist'
    );
    mockConvertOutputToTestInfo = sandbox.stub(
      outputModule,
      'convertOutputToTestInfo'
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should correctly process test result outputs and return TestInfo array', async () => {
    // Given
    const testResultOutput: outputModule.TestResultOutput[] = [
      {
        timer: new Timer(''),
        action: 'action1',
        flowName: 'flow1',
        product: '',
        testType: '',
        error: 'error',
      },
      {
        timer: new Timer(''),
        action: 'action2',
        flowName: 'flow2',
        product: '',
        testType: '',
        error: 'error',
      },
    ];

    const flowActionPairs = [
      { flowName: 'flow1', actionName: 'action1' },
      { flowName: 'flow2', actionName: 'action2' },
    ];

    const existingRecords = [{ flowName: 'flow1', actionName: 'action1' }];

    const testInfoResults = [
      Object.assign(new TestInfo(), {
        flowName: 'flow1',
        actionName: 'action1',
      }),
      Object.assign(new TestInfo(), {
        flowName: 'flow2',
        actionName: 'action2',
      }),
    ];

    mockGetTestInfoRecordThatAlreadyExist.resolves(existingRecords);
    mockConvertOutputToTestInfo
      .onCall(0)
      .returns(testInfoResults[0])
      .onCall(1)
      .returns(testInfoResults[1]);

    // When
    const result = await convertTestResultOutputToTestInfo(testResultOutput);

    // Then
    expect(
      mockGetTestInfoRecordThatAlreadyExist.calledOnceWith(flowActionPairs)
    ).to.be.true;
    expect(mockConvertOutputToTestInfo.calledTwice).to.be.true;
    expect(
      mockConvertOutputToTestInfo.firstCall.calledWith(
        testResultOutput[0],
        existingRecords
      )
    ).to.be.true;
    expect(
      mockConvertOutputToTestInfo.secondCall.calledWith(
        testResultOutput[1],
        existingRecords
      )
    ).to.be.true;
    expect(result).to.deep.equal(testInfoResults);
  });

  it('should handle empty test result output array', async () => {
    // Given
    const testResultOutput: outputModule.TestResultOutput[] = [];

    mockGetTestInfoRecordThatAlreadyExist.resolves([]);

    // When
    const result = await convertTestResultOutputToTestInfo(testResultOutput);

    // THen
    expect(mockGetTestInfoRecordThatAlreadyExist.calledOnceWith([])).to.be.true;
    expect(mockConvertOutputToTestInfo.notCalled).to.be.true;
    expect(result).to.deep.equal([]);
  });

  it('should handle database errors gracefully', async () => {
    // Given
    const testResultOutput: outputModule.TestResultOutput[] = [
      {
        timer: new Timer(''),
        action: 'action1',
        flowName: 'flow1',
        product: '',
        testType: '',
      },
    ];
    mockGetTestInfoRecordThatAlreadyExist.rejects(new Error('Database error'));

    // When
    try {
      await convertTestResultOutputToTestInfo(testResultOutput);
      expect.fail('Expected function to throw an error');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal('Database error');
    }

    // Then
    expect(mockGetTestInfoRecordThatAlreadyExist.calledOnce).to.be.true;
    expect(mockConvertOutputToTestInfo.notCalled).to.be.true;
  });
});
