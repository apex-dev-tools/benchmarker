/*
 * Copyright (c) 2025 Certinia, inc. All rights reserved.
 */

import {
  getAverageLimitValuesFromDB,
  saveAlerts,
} from '../../src/database/alertInfo';
import * as db from '../../src/database/connection';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import { DataSource } from 'typeorm';
import { Alert } from '../../src/database/entity/alert';

chai.use(sinonChai);

describe('src/database/alertInfo', () => {
  let mockQuery: sinon.SinonStub;
  let connectionStub: sinon.SinonStub;
  let mockDataSource: any;

  beforeEach(() => {
    mockQuery = sinon.stub();
    mockDataSource = { query: mockQuery };
    connectionStub = sinon.stub(db, 'getConnection').resolves(mockDataSource);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getAverageLimitValuesFromDB', () => {
    it('should return average limit values for valid data', async () => {
      //Given
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
          queryrowavg: 35,
          run_count: 5,
        },
        {
          flow_name: 'flow2',
          action: 'action2',
          dmlavg: 12,
          soqlavg: 18,
          cpuavg: 22,
          dmlrowavg: 28,
          heapavg: 32,
          queryrowavg: 38,
          run_count: 6,
        },
      ];

      mockQuery.resolves(mockResults);

      // When
      const results = await getAverageLimitValuesFromDB(flowActionPairs);

      // Then
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
          queryrowavg: 35,
          runcount: 5,
        },
        flow2_action2: {
          dmlavg: 12,
          soqlavg: 18,
          cpuavg: 22,
          dmlrowavg: 28,
          heapavg: 32,
          queryrowavg: 38,
          runcount: 6,
        },
      });
    });

    it('should return an empty object when no results are found', async () => {
      //Given
      const flowActionPairs = [{ flowName: 'flow1', actionName: 'action1' }];

      mockQuery.resolves([]);

      //When
      const results = await getAverageLimitValuesFromDB(flowActionPairs);

      //Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should handle missing fields and default them to zero', async () => {
      //Given
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
          queryrowavg: null,
          run_count: 6,
        },
      ];

      mockQuery.resolves(mockResults);

      //When
      const results = await getAverageLimitValuesFromDB(flowActionPairs);

      //Then
      expect(results).to.deep.equal({
        flow1_action1: {
          dmlavg: 0,
          soqlavg: 0,
          cpuavg: 20,
          dmlrowavg: 25,
          heapavg: 30,
          queryrowavg: 0,
          runcount: 6,
        },
      });
    });

    it('should handle an empty flowActionPairs array and return an empty object', async () => {
      //Given
      const flowActionPairs: { flowName: string; actionName: string }[] = [];

      // Simulate no results (empty array)
      mockQuery.resolves([]);

      // When
      const results = await getAverageLimitValuesFromDB(flowActionPairs);

      // Then
      expect(results).to.deep.equal({});
    });

    it('should handle errors and return an empty object', async () => {
      // Given
      const flowActionPairs = [{ flowName: 'flow1', actionName: 'action1' }];

      mockQuery.rejects(new Error('Database error'));

      // When
      const results = await getAverageLimitValuesFromDB(flowActionPairs);

      //Then
      expect(results).to.deep.equal({});
    });
  });

  describe('saveAlerts', () => {
    it('should save alert', async () => {
      // Given
      const saveStub: sinon.SinonStub = sinon.stub().resolvesArg(0);
      connectionStub.resolves({
        manager: { save: saveStub },
      } as unknown as DataSource);

      const results = [new Alert()];

      // When
      const savedRecords = await saveAlerts(results);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecords).to.eql(results);
    });
  });
});
