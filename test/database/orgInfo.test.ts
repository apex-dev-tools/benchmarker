/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import * as db from '../../src/database/connection';
import { OrgInfo } from '../../src/database/entity/org';
import { saveOrgInfo, getOrgInfoById } from '../../src/database/orgInfo';
import { DataSource } from 'typeorm';

chai.use(sinonChai);

describe('src/database/orgInfo', () => {
  let connectionStub: SinonStub;

  beforeEach(() => {
    connectionStub = sinon.stub(db, 'getConnection');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('saveOrgInfo', () => {
    it('should save orgInfo', async () => {
      // Given
      const saveStub: SinonStub = sinon.stub().resolvesArg(0);
      connectionStub.resolves({
        manager: { save: saveStub },
      } as unknown as DataSource);

      const orgInfo = new OrgInfo();
      orgInfo.orgId = 'testId';
      orgInfo.releaseVersion = 'testVersion';
      orgInfo.apiVersion = 'testApiVersion';
      orgInfo.orgType = 'testOrgType';
      orgInfo.instance = 'testInstance';
      orgInfo.isLex = true;
      orgInfo.isMulticurrency = true;
      orgInfo.isSandbox = false;
      orgInfo.isTrial = false;

      // When
      const savedRecord = await saveOrgInfo(orgInfo);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecord).to.eql(orgInfo);
    });

    it('should save orgInfo from context', async () => {
      // Given
      const saveStub: SinonStub = sinon.stub().resolvesArg(0);
      connectionStub.resolves({
        manager: { save: saveStub },
      } as unknown as DataSource);

      // When
      const orgInfo = new OrgInfo();
      orgInfo.fillOrgContextInformation({
        orgID: 'testId',
        releaseVersion: 'testVersion',
        apiVersion: 'testApiVersion',
        orgType: 'testOrgType',
        orgInstance: 'testInstance',
        isLex: true,
        isMulticurrency: true,
        isSandbox: false,
        isTrial: false,
      });

      const savedRecord = await saveOrgInfo(orgInfo);

      // Then
      expect(saveStub).to.be.calledOnce;
      expect(savedRecord).to.eql(orgInfo);
    });
  });

  describe('getOrgInfoById', () => {
    it('returns null for no org id', async () => {
      // Given
      // When
      const orgInfoResult = await getOrgInfoById(
        undefined as unknown as string,
        '45'
      );

      // Then
      expect(orgInfoResult).to.be.null;
    });

    it('returns null for no api version', async () => {
      // Given
      // When
      const orgInfoResult = await getOrgInfoById(
        'id',
        undefined as unknown as string
      );

      // Then
      expect(orgInfoResult).to.be.null;
    });

    it('returns row for id and api version', async () => {
      // Given
      const orgInfo = new OrgInfo();
      const queryStub = sinon.stub().resolves(orgInfo);
      connectionStub.resolves({
        getRepository: sinon.stub().returns({
          createQueryBuilder: sinon.stub().returns({
            getOne: queryStub,
            where: sinon.stub().returnsThis(),
            andWhere: sinon.stub().returnsThis(),
          }),
        }),
      } as unknown as DataSource);

      // When
      const result = await getOrgInfoById('id', '45');

      // Then
      expect(connectionStub).to.be.calledOnce;
      expect(queryStub).to.be.calledOnce;
      expect(result).to.eql(orgInfo);
    });
  });
});
