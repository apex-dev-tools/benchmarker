/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import * as saveModule from '../../src/database/saveRecords';
import {
  saveUiTestResult,
  loadUiTestResults,
  UiTestResultDTO,
  UiTestResultFilterOptions,
} from '../../src/database/uiTestResult';
import { DataSource } from 'typeorm';
import { UiTestResult } from '../../src/database/entity/uiTestResult';

chai.use(sinonChai);

describe('src/database/uiTestResult', () => {
  let connectionStub: SinonStub;
  let saveRecordsStub: SinonStub;

  beforeEach(() => {
    connectionStub = sinon.stub(db, 'getConnection');
    saveRecordsStub = sinon.stub(saveModule, 'saveRecords');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('saveUiTestResult', () => {
    it('should convert DTO to entities, save them and return DTO', async () => {
      // Given
      const dto: UiTestResultDTO = {
        testSuiteName: 'suite',
        individualTestName: 'test',
        componentLoadTime: 10,
        salesforceLoadTime: 20,
        overallLoadTime: 30,
      };

      const savedEntity = new UiTestResult();
      savedEntity.id = 1;
      savedEntity.testSuiteName = 'suite';
      savedEntity.individualTestName = 'test';
      savedEntity.componentLoadTime = 10;
      savedEntity.salesforceLoadTime = 20;
      savedEntity.overallLoadTime = 30;

      saveRecordsStub.resolves([savedEntity]);

      // When
      const result = await saveUiTestResult([dto]);

      // Then
      expect(saveRecordsStub).to.be.calledOnce;
      expect(result).to.eql([
        {
          testSuiteName: 'suite',
          individualTestName: 'test',
          componentLoadTime: 10,
          salesforceLoadTime: 20,
          overallLoadTime: 30,
        },
      ]);
    });
  });

  describe('loadUiTestResults', () => {
    it('should load all entities and return DTO when no filter is provided', async () => {
      // Given
      const entity = new UiTestResult();
      entity.id = 2;
      entity.testSuiteName = 'suite2';
      entity.individualTestName = 'test2';
      entity.componentLoadTime = 100;
      entity.salesforceLoadTime = 200;
      entity.overallLoadTime = 300;

      const findStub = sinon.stub().resolves([entity]);
      connectionStub.resolves({
        manager: { find: findStub },
      } as unknown as DataSource);

      // When
      const result = await loadUiTestResults();

      // Then
      expect(connectionStub).to.be.calledOnce;
      expect(findStub).to.be.calledWith(UiTestResult, { where: undefined });
      expect(result).to.eql([
        {
          testSuiteName: 'suite2',
          individualTestName: 'test2',
          componentLoadTime: 100,
          salesforceLoadTime: 200,
          overallLoadTime: 300,
        },
      ]);
    });

    it('should filter by testSuiteName when provided', async () => {
      // Given
      const entity1 = new UiTestResult();
      entity1.id = 3;
      entity1.testSuiteName = 'specific-suite';
      entity1.individualTestName = 'test3';
      entity1.componentLoadTime = 50;
      entity1.salesforceLoadTime = 150;
      entity1.overallLoadTime = 200;

      const findStub = sinon.stub().resolves([entity1]);
      connectionStub.resolves({
        manager: { find: findStub },
      } as unknown as DataSource);

      const filterOptions: UiTestResultFilterOptions = {
        testSuiteName: 'specific-suite',
      };

      // When
      const result = await loadUiTestResults(filterOptions);

      // Then
      expect(connectionStub).to.be.calledOnce;
      expect(findStub).to.be.calledWith(UiTestResult, {
        where: { testSuiteName: 'specific-suite' },
      });
      expect(result).to.eql([
        {
          testSuiteName: 'specific-suite',
          individualTestName: 'test3',
          componentLoadTime: 50,
          salesforceLoadTime: 150,
          overallLoadTime: 200,
        },
      ]);
    });

    it('should filter by multiple fields when provided', async () => {
      // Given
      const entity = new UiTestResult();
      entity.id = 4;
      entity.testSuiteName = 'multi-filter-suite';
      entity.individualTestName = 'multi-filter-test';
      entity.componentLoadTime = 75;
      entity.salesforceLoadTime = 125;
      entity.overallLoadTime = 250;

      const findStub = sinon.stub().resolves([entity]);
      connectionStub.resolves({
        manager: { find: findStub },
      } as unknown as DataSource);

      const filterOptions: UiTestResultFilterOptions = {
        testSuiteName: 'multi-filter-suite',
        individualTestName: 'multi-filter-test',
      };

      // When
      const result = await loadUiTestResults(filterOptions);

      // Then
      expect(connectionStub).to.be.calledOnce;
      expect(findStub).to.be.calledWith(UiTestResult, {
        where: {
          testSuiteName: 'multi-filter-suite',
          individualTestName: 'multi-filter-test',
        },
      });
      expect(result).to.eql([
        {
          testSuiteName: 'multi-filter-suite',
          individualTestName: 'multi-filter-test',
          componentLoadTime: 75,
          salesforceLoadTime: 125,
          overallLoadTime: 250,
        },
      ]);
    });

    it('should return empty array when no matching records found', async () => {
      // Given
      const findStub = sinon.stub().resolves([]);
      connectionStub.resolves({
        manager: { find: findStub },
      } as unknown as DataSource);

      const filterOptions: UiTestResultFilterOptions = {
        testSuiteName: 'non-existent-suite',
      };

      // When
      const result = await loadUiTestResults(filterOptions);

      // Then
      expect(connectionStub).to.be.calledOnce;
      expect(findStub).to.be.calledWith(UiTestResult, {
        where: { testSuiteName: 'non-existent-suite' },
      });
      expect(result).to.eql([]);
    });
  });
});
