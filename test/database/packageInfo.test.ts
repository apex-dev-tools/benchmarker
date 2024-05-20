/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { PackageInfo } from '../../src/database/entity/package';
import {
  savePackageInfo,
  getPackagesByVersionId,
} from '../../src/database/packageInfo';
import { DataSource } from 'typeorm';

chai.use(sinonChai);

describe('src/database/packageInfo', () => {
  let connectionStub: SinonStub;

  beforeEach(() => {
    connectionStub = sinon.stub(db, 'getConnection');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('savePackageInfo', () => {
    it('should save packageInfo', async () => {
      // Given
      const saveStub: SinonStub = sinon.stub().resolvesArg(0);
      connectionStub.resolves({
        manager: { save: saveStub },
      } as unknown as DataSource);

      const pkgInfo = new PackageInfo();
      pkgInfo.packageVersion = 'testPackageVersion';
      pkgInfo.packageName = 'testPackageName';
      pkgInfo.packageVersionId = 'testPackageVersionId';
      pkgInfo.packageId = 'testPackageId';
      pkgInfo.isBeta = false;
      pkgInfo.betaName = 1;

      // When
      const savedRecord = await savePackageInfo([pkgInfo]);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecord).to.eql([pkgInfo]);
    });
  });

  describe('getPackagesByVersionId', () => {
    it('returns empty for undefined package list', async () => {
      // Given
      // When
      const packageInfos = await getPackagesByVersionId(
        undefined as unknown as string[]
      );

      // Then
      expect(packageInfos).to.eql([]);
    });

    it('returns empty for no packages', async () => {
      // Given
      // When
      const packageInfos = await getPackagesByVersionId([]);

      // Then
      expect(packageInfos).to.eql([]);
    });

    it('returns rows for version ids', async () => {
      // Given
      const pkgInfo = new PackageInfo();
      const queryStub = sinon.stub().resolves([pkgInfo]);
      connectionStub.resolves({
        getRepository: sinon.stub().returns({
          createQueryBuilder: sinon.stub().returns({
            getMany: queryStub,
            where: sinon.stub().returnsThis(),
            andWhere: sinon.stub().returnsThis(),
          }),
        }),
      } as unknown as DataSource);

      // When
      const result = await getPackagesByVersionId(['id']);

      // Then
      expect(connectionStub).to.be.calledOnce;
      expect(queryStub).to.be.calledOnce;
      expect(result).to.eql([pkgInfo]);
    });
  });
});
