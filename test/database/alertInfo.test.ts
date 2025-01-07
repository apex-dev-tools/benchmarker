/*
 * Copyright (c) 2025 Certinia, inc. All rights reserved.
 */

import { getAverageLimitValuesFromDB } from '../../src/database/alertInfo';
import * as db from '../../src/database/connection';
import sinon from 'sinon';
import { expect } from 'chai';

describe('getAverageLimitValuesFromDB', () => {
  let mockQuery: sinon.SinonStub;
  let mockDataSource: any;

  beforeEach(() => {
    mockQuery = sinon.stub();
    mockDataSource = { query: mockQuery };
    sinon.stub(db, 'getConnection').resolves(mockDataSource);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return average limit values for valid data', async () => {
    const flowActionPairs = [
      { flowName: 'flow1', actionName: 'action1' },
      { flowName: 'flow2', actionName: 'action2' },
    ];

    const mockResults = [
      {
        flow_name: 'flow1',
        action: 'action1',
        dmlavg: 10,
        soqlavg: 15,
        cpuavg: 20,
        dmlrowavg: 25,
        heapavg: 30,
        soqlrowavg: 35,
      },
      {
        flow_name: 'flow2',
        action: 'action2',
        dmlavg: 12,
        soqlavg: 18,
        cpuavg: 22,
        dmlrowavg: 28,
        heapavg: 32,
        soqlrowavg: 38,
      },
    ];

    mockQuery.resolves(mockResults);

    const results = await getAverageLimitValuesFromDB(flowActionPairs);

    expect(mockQuery.calledOnce).to.be.true;
    expect(mockQuery.args[0][0]).to.include('SELECT');
    expect(mockQuery.args[0][0]).to.include(
      "(flow_name, action) IN (('flow1', 'action1'), ('flow2', 'action2'))"
    );

    expect(results).to.deep.equal({
      flow1_action1: {
        dmlavg: 10,
        soqlavg: 15,
        cpuavg: 20,
        dmlrowavg: 25,
        heapavg: 30,
        soqlrowavg: 35,
      },
      flow2_action2: {
        dmlavg: 12,
        soqlavg: 18,
        cpuavg: 22,
        dmlrowavg: 28,
        heapavg: 32,
        soqlrowavg: 38,
      },
    });
  });

  it('should return an empty object when no results are found', async () => {
    const flowActionPairs = [{ flowName: 'flow1', actionName: 'action1' }];

    mockQuery.resolves([]);

    const results = await getAverageLimitValuesFromDB(flowActionPairs);

    expect(mockQuery.calledOnce).to.be.true;
    expect(results).to.deep.equal({});
  });

  it('should handle errors and return an empty object', async () => {
    const flowActionPairs = [{ flowName: 'flow1', actionName: 'action1' }];

    mockQuery.rejects(new Error('Database error'));

    const results = await getAverageLimitValuesFromDB(flowActionPairs);

    expect(mockQuery.calledOnce).to.be.true;
    expect(results).to.deep.equal({});
  });

  it('should handle missing fields and default them to zero', async () => {
    const flowActionPairs = [{ flowName: 'flow1', actionName: 'action1' }];

    const mockResults = [
      {
        flow_name: 'flow1',
        action: 'action1',
        dmlavg: null,
        soqlavg: undefined,
        cpuavg: 20,
        dmlrowavg: 25,
        heapavg: 30,
        soqlrowavg: null,
      },
    ];

    mockQuery.resolves(mockResults);

    const results = await getAverageLimitValuesFromDB(flowActionPairs);

    expect(results).to.deep.equal({
      flow1_action1: {
        dmlavg: 0,
        soqlavg: 0,
        cpuavg: 20,
        dmlrowavg: 25,
        heapavg: 30,
        soqlrowavg: 0,
      },
    });
  });

  it('should handle an empty flowActionPairs array and return an empty object', async () => {
    const flowActionPairs: { flowName: string; actionName: string }[] = [];

    // Simulate no results (empty array)
    mockQuery.resolves([]);

    const results = await getAverageLimitValuesFromDB(flowActionPairs);

    expect(results).to.deep.equal({});
  });
});
