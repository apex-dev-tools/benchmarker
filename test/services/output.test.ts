/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import {
  getOffsetThresholdsByRange,
  addAlertByComparingAvg,
  TestResultOutput,
} from '../../src/services/result/output';
import { RangeCollection } from '../../src/services/ranges';
import { TestResult } from '../../src/database/entity/result';

describe('services/result/output', () => {
  describe('getThresholdsByRange', () => {
    it('should return the correct offsetThreshold based on the given averages and ranges', () => {
      //Given
      const rangeCollection: RangeCollection = {
        dml_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 10 }],
        soql_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 5 }],
        cpu_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 20 }],
        dmlRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 10 },
        ],
        heap_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 5 }],
        queryRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 15 },
        ],
      };

      const averageResults = {
        dmlavg: 50,
        soqlavg: 50,
        cpuavg: 50,
        dmlrowavg: 50,
        heapavg: 50,
        queryrowavg: 50,
      };

      //When
      const thresholds = getOffsetThresholdsByRange(
        averageResults,
        rangeCollection
      );

      //Then
      expect(thresholds.dmlThreshold).to.equal(10);
      expect(thresholds.soqlThreshold).to.equal(5);
      expect(thresholds.cpuThreshold).to.equal(20);
      expect(thresholds.dmlRowThreshold).to.equal(10);
      expect(thresholds.heapThreshold).to.equal(5);
      expect(thresholds.queryRowThreshold).to.equal(15);
    });
  });

  describe('addAlertByComparingAvg', () => {
    it('should create an alert based on degradation compared to the average', async () => {
      //Given
      const output: TestResultOutput = {
        result: {
          action: 'testAction',
          flowName: 'testFlow',
          cpuTime: 120,
          dmlRows: 250,
          dmlStatements: 160,
          heapSize: 150,
          queryRows: 450,
          soqlQueries: 60,
        } as TestResult,
      };

      const preFetchedAverages = {
        testFlow_testAction: {
          dmlavg: 100,
          soqlavg: 50,
          cpuavg: 100,
          dmlrowavg: 50,
          heapavg: 100,
          queryrowavg: 400,
          runcount: 10,
        },
      };

      const rangeCollection: RangeCollection = {
        dml_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 10 }],
        soql_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 5 }],
        cpu_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 10 }],
        dmlRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 10 },
        ],
        heap_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 5 }],
        queryRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 15 },
        ],
      };

      //When
      const alert = await addAlertByComparingAvg(
        output,
        preFetchedAverages,
        rangeCollection
      );

      //Then
      expect(alert).to.have.property('cpuTimeDegraded').that.equals(20);
      expect(alert).to.have.property('dmlRowsDegraded').that.equals(200);
      expect(alert).to.have.property('dmlStatementsDegraded').that.equals(60);
      expect(alert).to.have.property('heapSizeDegraded').that.equals(50);
      expect(alert).to.have.property('queryRowsDegraded').that.equals(50);
      expect(alert).to.have.property('soqlQueriesDegraded').that.equals(10);
    });

    it('should return null alert when run count is less than 5', async () => {
      //Given
      const output: TestResultOutput = {
        result: {
          action: 'testAction',
          flowName: 'testFlow',
          cpuTime: 120,
          dmlRows: 250,
          dmlStatements: 160,
          heapSize: 150,
          queryRows: 450,
          soqlQueries: 60,
        } as TestResult,
      };

      const preFetchedAverages = {
        testFlow_testAction: {
          dmlavg: 100,
          soqlavg: 50,
          cpuavg: 100,
          dmlrowavg: 50,
          heapavg: 100,
          queryrowavg: 400,
          runcount: 3,
        },
      };

      const rangeCollection: RangeCollection = {
        dml_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 10 }],
        soql_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 5 }],
        cpu_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 10 }],
        dmlRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 10 },
        ],
        heap_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 5 }],
        queryRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 15 },
        ],
      };

      //When
      const alert = await addAlertByComparingAvg(
        output,
        preFetchedAverages,
        rangeCollection
      );

      //Then
      expect(alert).to.have.property('action').that.equals('testAction');
      expect(alert).to.have.property('flowName').that.equals('testFlow');
      expect(alert).to.have.property('cpuTimeDegraded').that.equals(-1);
      expect(alert).to.have.property('dmlRowsDegraded').that.equals(-1);
      expect(alert).to.have.property('dmlStatementsDegraded').that.equals(-1);
      expect(alert).to.have.property('heapSizeDegraded').that.equals(-1);
      expect(alert).to.have.property('queryRowsDegraded').that.equals(-1);
    });

    it('should create an alert when threshold information is provided in alertInfo', async () => {
      //Given
      const output: TestResultOutput = {
        result: {
          action: 'testAction',
          flowName: 'testFlow',
          cpuTime: 120,
          dmlRows: 250,
          dmlStatements: 60,
          heapSize: 350,
          queryRows: 250,
          soqlQueries: 60,
        } as TestResult,
        alertInfo: {
          thresholds: {
            cpuTimeThreshold: 110,
            dmlRowThreshold: 240,
            dmlStatementThreshold: 55,
            heapSizeThreshold: 330,
            queryRowsThreshold: 240,
            soqlQueriesThreshold: 55,
          },
          storeAlerts: true,
        },
      };

      const preFetchedAverages = {
        testFlow_testAction: {
          dmlavg: 50,
          soqlavg: 50,
          cpuavg: 100,
          dmlrowavg: 200,
          heapavg: 300,
          queryrowavg: 200,
          runcount: 10,
        },
      };

      const rangeCollection: RangeCollection = {
        dml_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 10 }],
        soql_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 10 }],
        cpu_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 20 }],
        dmlRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 10 },
        ],
        heap_ranges: [{ start_range: 0, end_range: 100, offset_threshold: 5 }],
        queryRows_ranges: [
          { start_range: 0, end_range: 100, offset_threshold: 15 },
        ],
      };

      //When
      const alert = await addAlertByComparingAvg(
        output,
        preFetchedAverages,
        rangeCollection
      );

      //Then
      expect(alert).to.have.property('cpuTimeDegraded').that.equals(20);
      expect(alert).to.have.property('dmlRowsDegraded').that.equals(50);
      expect(alert).to.have.property('dmlStatementsDegraded').that.equals(10);
      expect(alert).to.have.property('heapSizeDegraded').that.equals(50);
      expect(alert).to.have.property('queryRowsDegraded').that.equals(50);
      expect(alert).to.have.property('soqlQueriesDegraded').that.equals(10);
    });
  });
});
