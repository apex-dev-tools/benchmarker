/*
 * Copyright (c) 2025 Certinia, Inc. All rights reserved.
 */

import { getTestInfoRecordThatAlreadyExist } from '../../src/database/testInfo';
import * as db from '../../src/database/connection';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

describe('src/database/testInfo', () => {
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

  describe('getTestInfoRecordThatAlreadyExist', () => {
    it('should return existing test info records for valid data', async () => {
      // Given
      const flowActionPairs = [
        { flowName: 'flow1', actionName: 'action1' },
        { flowName: 'flow2', actionName: 'action2' },
      ];

      const mockResults = [
        { id: 1, flow_name: 'flow1', action: 'action1' },
        { id: 2, flow_name: 'flow2', action: 'action2' },
      ];

      mockQuery.resolves(mockResults);

      // When
      const results = await getTestInfoRecordThatAlreadyExist(flowActionPairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(mockQuery.args[0][0]).to.include('SELECT');
      expect(mockQuery.args[0][0]).to.include(
        "(flow_name, action) IN (('flow1', 'action1'), ('flow2', 'action2'))"
      );

      expect(results).to.deep.equal({
        flow1_action1: 1,
        flow2_action2: 2,
      });
    });

    it('should return an empty object when no results are found', async () => {
      // Given
      const flowActionPairs = [{ flowName: 'flow1', actionName: 'action1' }];

      mockQuery.resolves([]);

      // When
      const results = await getTestInfoRecordThatAlreadyExist(flowActionPairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should handle an empty flowActionPairs array and return an empty object', async () => {
      // Given
      const flowActionPairs: { flowName: string; actionName: string }[] = [];

      mockQuery.resolves([]);

      // When
      const results = await getTestInfoRecordThatAlreadyExist(flowActionPairs);

      // Then
      expect(results).to.deep.equal({});
    });

    it('should handle errors and return an empty object', async () => {
      // Given
      const flowActionPairs = [{ flowName: 'flow1', actionName: 'action1' }];
      const consoleErrorStub = sinon.stub(console, 'error');
      mockQuery.rejects(new Error('Database error'));

      // When
      const results = await getTestInfoRecordThatAlreadyExist(flowActionPairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
      expect(consoleErrorStub).to.have.been.calledWith(
        'Error in existing records: ',
        sinon.match.instanceOf(Error)
      );
      consoleErrorStub.restore();
    });
  });
});
