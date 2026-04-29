/*
 * Copyright (c) 2025 Certinia, inc. All rights reserved.
 */

import {
  getAverageLimitValuesFromDB,
  saveAlerts,
  checkRecentUiAlerts,
  buildKey,
  SuiteTestLwsPair,
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
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
          lwsEnabled: false,
        },
        {
          testSuiteName: 'testSuiteName2',
          individualTestName: 'individualTestName2',
          lwsEnabled: true,
        },
      ];

      const mockAvgResults = [
        {
          test_suite_name: 'testSuiteName1',
          individual_test_name: 'individualTestName1',
          lws_enabled: false,
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
        {
          test_suite_name: 'testSuiteName2',
          individual_test_name: 'individualTestName2',
          lws_enabled: true,
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
      ];

      mockQuery.resolves(mockAvgResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(mockQuery.args[0][0]).to.include('SELECT');
      expect(mockQuery.args[0][0]).to.include(
        '(test_suite_name, individual_test_name, lws_enabled) IN'
      );
      expect(mockQuery.args[0][0]).to.include('HAVING');
      expect(mockQuery.args[0][1]).to.deep.equal([
        'testSuiteName1',
        'individualTestName1',
        false,
        'testSuiteName2',
        'individualTestName2',
        true,
      ]);

      expect(results).to.deep.equal({
        [buildKey('testSuiteName1', 'individualTestName1', false)]: {
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
        [buildKey('testSuiteName2', 'individualTestName2', true)]: {
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
      });
    });

    it('should exclude tests with fewer than the minimum baseline runs via HAVING', async () => {
      // Given — DB only returns the test that passed the HAVING threshold
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
          lwsEnabled: false,
        },
        {
          testSuiteName: 'testSuiteName2',
          individualTestName: 'individualTestName2',
          lwsEnabled: false,
        },
      ];

      const mockAvgResults = [
        {
          test_suite_name: 'testSuiteName1',
          individual_test_name: 'individualTestName1',
          lws_enabled: false,
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
        // testSuiteName2 excluded by HAVING (< MIN_BASELINE_COUNT runs in baseline window)
      ];

      mockQuery.resolves(mockAvgResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({
        [buildKey('testSuiteName1', 'individualTestName1', false)]: {
          avg_load_time_past_5_days: 2000,
          avg_load_time_6_to_15_days_ago: 1500,
        },
      });
    });

    it('should return {} when all tests are excluded by HAVING', async () => {
      // Given
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
          lwsEnabled: false,
        },
        {
          testSuiteName: 'testSuiteName2',
          individualTestName: 'individualTestName2',
          lwsEnabled: false,
        },
      ];

      mockQuery.resolves([]);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should return an empty object when no results are found', async () => {
      // Given
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
          lwsEnabled: false,
        },
      ];

      mockQuery.resolves([]);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should return null for missing average fields instead of defaulting to zero', async () => {
      // Given — null averages must not be silently coerced to 0, which would
      // produce a false degradation signal.
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
          lwsEnabled: false,
        },
      ];

      const mockAvgResults = [
        {
          test_suite_name: 'testSuiteName1',
          individual_test_name: 'individualTestName1',
          lws_enabled: false,
          avg_load_time_past_5_days: null,
          avg_load_time_6_to_15_days_ago: null,
        },
      ];

      mockQuery.resolves(mockAvgResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(results).to.deep.equal({
        [buildKey('testSuiteName1', 'individualTestName1', false)]: {
          avg_load_time_past_5_days: null,
          avg_load_time_6_to_15_days_ago: null,
        },
      });
    });

    it('should return {} for an empty suiteAndTestNamePairs array without querying the DB', async () => {
      // When
      const results = await getAverageLimitValuesFromDB([]);

      // Then
      expect(mockQuery.notCalled).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should handle errors and return an empty object', async () => {
      // Given
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'testSuiteName1',
          individualTestName: 'individualTestName1',
          lwsEnabled: false,
        },
      ];

      mockQuery.rejects(new Error('Database error'));

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(results).to.deep.equal({});
    });

    it('should return {} on query error and log the error message', async () => {
      // Given
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'suite1',
          individualTestName: 'test1',
          lwsEnabled: false,
        },
        {
          testSuiteName: 'suite1',
          individualTestName: 'test1',
          lwsEnabled: true,
        },
      ];

      const consoleStub = sinon.stub(console, 'error');
      mockQuery.rejects(new Error('Connection failed'));

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(results).to.deep.equal({});
      expect(consoleStub).to.have.been.calledWith(
        sinon.match('Error in fetching the average values: ')
      );

      consoleStub.restore();
    });

    it('should return {} when the DB returns null rows', async () => {
      // Given
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'suite1',
          individualTestName: 'test1',
          lwsEnabled: false,
        },
      ];

      mockQuery.resolves(null);

      // When
      const result = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(result).to.deep.equal({});
    });

    it('should scope by lwsEnabled so same test with different lwsEnabled values are separate', async () => {
      // Given
      const suiteAndTestNamePairs: SuiteTestLwsPair[] = [
        {
          testSuiteName: 'suite1',
          individualTestName: 'test1',
          lwsEnabled: false,
        },
        {
          testSuiteName: 'suite1',
          individualTestName: 'test1',
          lwsEnabled: true,
        },
      ];

      const mockAvgResults = [
        {
          test_suite_name: 'suite1',
          individual_test_name: 'test1',
          lws_enabled: false,
          avg_load_time_past_5_days: 1000,
          avg_load_time_6_to_15_days_ago: 800,
        },
        {
          test_suite_name: 'suite1',
          individual_test_name: 'test1',
          lws_enabled: true,
          avg_load_time_past_5_days: 1200,
          avg_load_time_6_to_15_days_ago: 900,
        },
      ];

      mockQuery.resolves(mockAvgResults);

      // When
      const results = await getAverageLimitValuesFromDB(suiteAndTestNamePairs);

      // Then
      expect(mockQuery.calledOnce).to.be.true;
      expect(results).to.deep.equal({
        [buildKey('suite1', 'test1', false)]: {
          avg_load_time_past_5_days: 1000,
          avg_load_time_6_to_15_days_ago: 800,
        },
        [buildKey('suite1', 'test1', true)]: {
          avg_load_time_past_5_days: 1200,
          avg_load_time_6_to_15_days_ago: 900,
        },
      });
    });
  });

  describe('buildKey', () => {
    it('should build key with suite name, test name, and lwsEnabled', () => {
      expect(buildKey('mySuite', 'myTest', false)).to.equal(
        'mySuite_myTest_false'
      );
      expect(buildKey('mySuite', 'myTest', true)).to.equal(
        'mySuite_myTest_true'
      );
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
      savedEntity.lwsEnabled = false;

      const alert: UiAlert = new UiAlert();
      alert.testSuiteName = savedEntity.testSuiteName;
      alert.individualTestName = savedEntity.individualTestName;
      alert.componentLoadTimeDegraded = 2;
      alert.alertType = 'normal';
      alert.lwsEnabled = false;
      const results = [alert];

      // When
      const savedRecords = await saveAlerts([savedEntity], results);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecords).to.eql(results);
      expect(savedRecords[0].uiTestResultId).to.equal(1);
    });

    it('should not link alert to result with different lwsEnabled value', async () => {
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
      savedEntity.lwsEnabled = false;

      const alert: UiAlert = new UiAlert();
      alert.testSuiteName = savedEntity.testSuiteName;
      alert.individualTestName = savedEntity.individualTestName;
      alert.componentLoadTimeDegraded = 2;
      alert.alertType = 'normal';
      alert.lwsEnabled = true;

      // When
      const savedRecords = await saveAlerts([savedEntity], [alert]);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecords[0].uiTestResultId).to.not.equal(1);
    });
  });

  describe('checkRecentUiAlerts', () => {
    it('should return a Set of keys for alerts found in the last 3 days using CURRENT_TIMESTAMP', async () => {
      // Given
      const pairs = [
        {
          testSuiteName: 'SuiteA',
          individualTestName: 'Test1',
          lwsEnabled: false,
        },
        {
          testSuiteName: 'SuiteB',
          individualTestName: 'Test2',
          lwsEnabled: false,
        },
      ];

      const mockDbRows = [
        {
          test_suite_name: 'SuiteA',
          individual_test_name: 'Test1',
          lws_enabled: false,
        },
      ];

      mockQuery.resolves(mockDbRows);

      // When
      const result = await checkRecentUiAlerts(pairs);

      // Then
      expect(mockQuery).to.have.been.calledOnce;

      const sqlQuery = mockQuery.firstCall.args[0];
      const queryParams = mockQuery.firstCall.args[1];
      expect(sqlQuery).to.include("INTERVAL '3 days'");
      expect(sqlQuery).to.include('CURRENT_TIMESTAMP');

      expect(sqlQuery).to.include('($1, $2, $3), ($4, $5, $6)');
      expect(queryParams).to.deep.equal([
        'SuiteA',
        'Test1',
        false,
        'SuiteB',
        'Test2',
        false,
      ]);

      expect(result).to.be.instanceOf(Set);
      expect(result.size).to.equal(1);
      expect(result.has('SuiteA_Test1_false')).to.be.true;
      expect(result.has('SuiteB_Test2_false')).to.be.false;
    });

    it('should not suppress an alert for lwsEnabled=false when an alert exists for lwsEnabled=true', async () => {
      // Given
      const pairs = [
        {
          testSuiteName: 'SuiteA',
          individualTestName: 'Test1',
          lwsEnabled: false,
        },
      ];

      const mockDbRows = [
        {
          test_suite_name: 'SuiteA',
          individual_test_name: 'Test1',
          lws_enabled: true,
        },
      ];

      mockQuery.resolves(mockDbRows);

      // When
      const result = await checkRecentUiAlerts(pairs);

      // Then
      expect(result.has('SuiteA_Test1_true')).to.be.true;
      expect(result.has('SuiteA_Test1_false')).to.be.false;
    });

    it('should return an empty Set if no recent alerts are found', async () => {
      // Given
      mockQuery.resolves([]);

      // When
      const result = await checkRecentUiAlerts([
        {
          testSuiteName: 'SuiteA',
          individualTestName: 'Test1',
          lwsEnabled: false,
        },
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
        {
          testSuiteName: 'SuiteA',
          individualTestName: 'Test1',
          lwsEnabled: false,
        },
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
