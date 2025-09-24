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
        id: 1,
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
          id: 1,
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
    it('should load entities and return DTO', async () => {
      // Given
      const entity = new UiTestResult();
      entity.id = 2;
      entity.testSuiteName = 'suite2';
      entity.individualTestName = 'test2';
      entity.componentLoadTime = 100;
      entity.salesforceLoadTime = 200;
      entity.overallLoadTime = 300;

      connectionStub.resolves({
        manager: { find: sinon.stub().resolves([entity]) },
      } as unknown as DataSource);

      // When
      const result = await loadUiTestResults();

      // Then
      expect(connectionStub).to.be.calledOnce;
      expect(result).to.eql([
        {
          id: 2,
          testSuiteName: 'suite2',
          individualTestName: 'test2',
          componentLoadTime: 100,
          salesforceLoadTime: 200,
          overallLoadTime: 300,
        },
      ]);
    });
  });
});
