/*
 * Copyright (c) 2025 Certinia, inc. All rights reserved.
 */

import {
  getAverageLimitValuesFromDB,
  saveAlerts,
  checkRecentUiAlerts,
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

      const mockCountResults = [
        {
          individual_test_name: 'individualTestName1',
          count_older_than_15_days: 20,
        },
        {
          individual_test_name: 'individualTestName2',
          count_older_than_15_days: 18,
        },
      ];

      const mockAvgResults = [
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

      mockQuery.onFirstCall().resolves(mockCountResults);
      mockQuery.onSecondCall().resolves(mockAvgResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledTwice).to.be.true;
      expect(mockQuery.args[1][0]).to.include('SELECT');
      expect(mockQuery.args[1][0]).to.include(
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

    it('should not return average limit values when a test has no results older than 15 days', async () => {
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

      const mockCountResults = [
        {
          individual_test_name: 'individualTestName1',
          count_older_than_15_days: 20,
        },
        {
          individual_test_name: 'individualTestName2',
          count_older_than_15_days: 0,
        },
      ];

      const mockAvgResults = [
        {
          test_suite_name: 'testSuiteName1',
          individual_test_name: 'individualTestName1',
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
      ];

      mockQuery.onFirstCall().resolves(mockCountResults);
      mockQuery.onSecondCall().resolves(mockAvgResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledTwice).to.be.true;
      expect(mockQuery.args[1][0]).to.include('SELECT');
      expect(mockQuery.args[1][0]).to.include(
        "(test_suite_name, individual_test_name) IN (('testSuiteName1', 'individualTestName1'))"
      );

      expect(results).to.deep.equal({
        testSuiteName1_individualTestName1: {
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
      });
    });

    it('should not return average limit values when no results older than 15 days', async () => {
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

      const mockCountResults = [
        {
          individual_test_name: 'individualTestName1',
          count_older_than_15_days: 0,
        },
        {
          individual_test_name: 'individualTestName2',
          count_older_than_15_days: 0,
        },
      ];

      mockQuery.onFirstCall().resolves(mockCountResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;

      expect(results).to.deep.equal({});
    });

    it('should return an empty object when no results are found', async () => {
      // Given
      const suiteAndTestNamePairs = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
        },
      ];

      const mockCountResults = [
        {
          individual_test_name: 'individualTestName1',
          count_older_than_15_days: 20,
        },
        {
          individual_test_name: 'individualTestName2',
          count_older_than_15_days: 18,
        },
      ];

      mockQuery.onFirstCall().resolves(mockCountResults);
      mockQuery.onSecondCall().resolves([]);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledTwice).to.be.true;
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

      const mockCountResults = [
        {
          individual_test_name: 'individualTestName1',
          count_older_than_15_days: 20,
        },
        {
          individual_test_name: 'individualTestName2',
          count_older_than_15_days: 18,
        },
      ];

      const mockAvgResults = [
        {
          test_suite_name: 'testSuiteName1',
          individual_test_name: 'individualTestName1',
          avg_load_time_past_5_days: null,
          avg_load_time_6_to_15_days_ago: undefined,
        },
      ];

      mockQuery.onFirstCall().resolves(mockCountResults);
      mockQuery.onSecondCall().resolves(mockAvgResults);

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
      mockQuery.onFirstCall().resolves([]);
      mockQuery.onSecondCall().resolves([]);

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

  describe('checkRecentUiAlerts', () => {
    it('should return a Set of keys for alerts found in the last 3 days', async () => {
      // Given
      const pairs = [
        { testSuiteName: 'SuiteA', individualTestName: 'Test1' },
        { testSuiteName: 'SuiteB', individualTestName: 'Test2' },
      ];

      const mockDbRows = [
        { test_suite_name: 'SuiteA', individual_test_name: 'Test1' },
      ];

      mockQuery.resolves(mockDbRows);

      // When
      const result = await checkRecentUiAlerts(pairs);

      // Then
      expect(mockQuery).to.have.been.calledOnce;

      const sqlQuery = mockQuery.firstCall.args[0];
      expect(sqlQuery).to.include("INTERVAL '3 days'");

      expect(sqlQuery).to.include("('SuiteA', 'Test1')");
      expect(sqlQuery).to.include("('SuiteB', 'Test2')");

      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.equal(1);
      expect(result.has('SuiteA_Test1')).to.be.true;
      expect(result.has('SuiteB_Test2')).to.be.false;
    });

    it('should return an empty Set if no recent alerts are found', async () => {
      // Given
      mockQuery.resolves([]);

      // When
      const result = await checkRecentUiAlerts([
        { testSuiteName: 'SuiteA', individualTestName: 'Test1' },
      ]);

      // Then
      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.equal(0);
    });

    it('should handle database errors gracefully by returning an empty Set', async () => {
      // Given
      const consoleStub = sinon.stub(console, 'error');
      mockQuery.rejects(new Error('Connection failed'));

      // When
      const result = await checkRecentUiAlerts([
        { testSuiteName: 'SuiteA', individualTestName: 'Test1' },
      ]);

      // Then
      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.equal(0);
      expect(consoleStub).to.have.been.calledWith(
        sinon.match('Error checking recent UI alerts')
      );

      consoleStub.restore();
    });
  });
});
