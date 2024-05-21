/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import { TestResult } from '../../src/database/entity/result';
import { DataSource } from 'typeorm';

import * as db from '../../src/database/connection';
import { saveTestResult } from '../../src/database/testResult';

chai.use(sinonChai);

describe('src/database/testResult', () => {
  let connectionStub: SinonStub;

  beforeEach(() => {
    connectionStub = sinon.stub(db, 'getConnection');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('saveTestResult', () => {
    it('should save test result', async () => {
      // Given
      const saveStub: SinonStub = sinon.stub().resolvesArg(0);
      connectionStub.resolves({
        manager: { save: saveStub },
      } as unknown as DataSource);

      const results = [new TestResult()];

      // When
      const savedRecords = await saveTestResult(results);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecords).to.eql(results);
    });
  });
});
