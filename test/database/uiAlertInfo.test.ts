/*
 * Copyright (c) 2025 Certinia, inc. All rights reserved.
 */

import {
  getAverageLimitValuesFromDB,
  saveAlerts,
} from '../../src/database/uiAlertInfo';
import * as db from '../../src/database/connection';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import { DataSource } from 'typeorm';
import { UiAlert } from '../../src/database/entity/uiAlert';
import { UiTestResult } from '../../src/database/entity/uiTestResult';

chai.use(sinonChai);

describe('src/database/uiAlertInfo', () => {
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
      // Given
      const suiteAndTestNamePairs = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
        },
        {
          testSuiteName: 'testSuiteName2',
          individualTestName: 'individualTestName2',
        },
      ];

      const mockResults = [
        {
          test_suite_name: 'testSuiteName1',
          individual_test_name: 'individualTestName1',
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
        {
          test_suite_name: 'testSuiteName2',
          individual_test_name: 'individualTestName2',
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
      ];

      mockQuery.resolves(mockResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(mockQuery.args[0][0]).to.include('SELECT');
      expect(mockQuery.args[0][0]).to.include(
        "(test_suite_name, individual_test_name) IN (('testSuiteName1', 'individualTestName1'), ('testSuiteName2', 'individualTestName2'))"
      );

      expect(results).to.deep.equal({
        testSuiteName1_individualTestName1: {
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
        testSuiteName2_individualTestName2: {
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
      });
    });

    it('should return an empty object when no results are found', async () => {
      // Given
      const suiteAndTestNamePairs = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
        },
      ];

      mockQuery.resolves([]);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should handle missing fields and default them to zero', async () => {
      // Given
      const suiteAndTestNamePairs = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
        },
      ];

      const mockResults = [
        {
          test_suite_name: 'testSuiteName1',
          individual_test_name: 'individualTestName1',
          avg_load_time_past_5_days: null,
          avg_load_time_6_to_15_days_ago: undefined,
        },
      ];

      mockQuery.resolves(mockResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(results).to.deep.equal({
        testSuiteName1_individualTestName1: {
          avg_load_time_past_5_days: 0,
          avg_load_time_6_to_15_days_ago: 0,
        },
      });
    });

    it('should handle an empty suiteAndTestNamePairs array and return an empty object', async () => {
      // Given
      const suiteAndTestNamePairs: {
        testSuiteName: string;
        individualTestName: string;
      }[] = [];

      // Simulate no results (empty array)
      mockQuery.resolves([]);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(results).to.deep.equal({});
    });

    it('should handle errors and return an empty object', async () => {
      // Given
      const suiteAndTestNamePairs = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
        },
      ];

      mockQuery.rejects(new Error('Database error'));

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
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

      const savedEntity = new UiTestResult();
      savedEntity.id = 1;
      savedEntity.testSuiteName = 'suite';
      savedEntity.individualTestName = 'test';
      savedEntity.componentLoadTime = 10;
      savedEntity.salesforceLoadTime = 20;
      savedEntity.overallLoadTime = 30;

      const alert: UiAlert = new UiAlert();
      alert.testSuiteName = savedEntity.testSuiteName;
      alert.individualTestName = savedEntity.individualTestName;
      alert.componentLoadTimeDegraded = 2;
      alert.alertType = 'normal';
      const results = [alert];

      // When
      const savedRecords = await saveAlerts([savedEntity], results);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecords).to.eql(results);
      expect(savedRecords[0].uiTestResultId).to.equal(1);
    });
  });
});
