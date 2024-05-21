/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { ExecutionInfo } from '../../src/database/entity/execution';
import { DataSource } from 'typeorm';
import { saveExecutionInfo } from '../../src/database/executionInfo';

chai.use(sinonChai);

describe('src/database/executionInfo', () => {
  let connectionStub: SinonStub;

  beforeEach(() => {
    connectionStub = sinon.stub(db, 'getConnection');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should save executionInfo', async () => {
    // Given
    const saveStub: SinonStub = sinon.stub().resolvesArg(0);
    connectionStub.resolves({
      manager: { save: saveStub },
    } as unknown as DataSource);

    const executionInfo = new ExecutionInfo();
    executionInfo.packageInfoId = 1;
    executionInfo.orgInfoId = 2;
    executionInfo.testResultId = 3;

    // When
    const savedRecords = await saveExecutionInfo([executionInfo]);

    // Then
    expect(saveStub).to.have.been.calledOnce;
    expect(savedRecords).to.eql([executionInfo]);
  });
});
