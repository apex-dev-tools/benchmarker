/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { saveRecords } from '../../src/database/saveRecords';
import { DataSource } from 'typeorm';

chai.use(sinonChai);

describe('src/database/saveRecords', () => {
  let connectionStub: SinonStub;

  beforeEach(() => {
    connectionStub = sinon.stub(db, 'getConnection');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('saveRecords', () => {
    it('should save rows via manager.save and return them', async () => {
      // Given
      const saveStub: SinonStub = sinon.stub().resolvesArg(0);
      connectionStub.resolves({
        manager: { save: saveStub },
      } as unknown as DataSource);

      const rows = [{ a: 1 }, { b: 2 }];

      // When
      const result = await saveRecords(rows);

      // Then
      expect(saveStub).to.be.calledOnceWithExactly(rows);
      expect(result).to.eql(rows);
    });
  });
});
