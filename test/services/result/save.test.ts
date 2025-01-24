/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import * as execInfo from '../../../src/database/executionInfo';
import * as pkgInfo from '../../../src/database/packageInfo';
import * as orgInfo from '../../../src/database/orgInfo';
import * as testResult from '../../../src/database/testResult';
import * as alertInfo from '../../../src/database/alertInfo';
import { save } from '../../../src/services/result/save';
import { TestResult } from '../../../src/database/entity/result';
import { OrgContext } from '../../../src/services/org/context';
import { Alert } from '../../../src/database/entity/alert';

chai.use(sinonChai);

const defaultOrgContext: OrgContext = {
  orgInfo: {
    apiVersion: '45',
    orgID: '123',
    releaseVersion: 'TestSpring2019',
    orgType: 'test type',
    orgInstance: 'test instance',
    isSandbox: false,
    isTrial: false,
    isMulticurrency: false,
    isLex: false,
  },
  packagesInfo: [
    {
      packageVersion: '1.200',
      packageName: 'Test 1',
      packageVersionId: '12',
      packageId: '1234',
      isBeta: false,
      betaName: -1,
    },
  ],
};

describe('src/services/result/save', () => {
  let testSaveStub: SinonStub;
  let orgIdStub: SinonStub;
  let orgSaveStub: SinonStub;
  let pkgIdStub: SinonStub;
  let pkgSaveStub: SinonStub;
  let execSaveStub: SinonStub;
  let alertInfoStub: SinonStub;

  beforeEach(() => {
    process.env.DATABASE_URL = 'test';

    testSaveStub = sinon.stub(testResult, 'saveTestResult');
    orgIdStub = sinon.stub(orgInfo, 'getOrgInfoById');
    orgSaveStub = sinon.stub(orgInfo, 'saveOrgInfo');
    pkgIdStub = sinon.stub(pkgInfo, 'getPackagesByVersionId');
    pkgSaveStub = sinon.stub(pkgInfo, 'savePackageInfo');
    execSaveStub = sinon.stub(execInfo, 'saveExecutionInfo');
    alertInfoStub = sinon.stub(alertInfo, 'saveAlerts');

    testSaveStub.resolvesArg(0);
    orgIdStub.resolves(null);
    orgSaveStub.resolvesArg(0);
    pkgIdStub.resolves([]);
    pkgSaveStub.resolvesArg(0);
    execSaveStub.resolvesArg(0);
    alertInfoStub.resolvesArg(0);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should save all records with alerts', async () => {
    // Given
    const result = new TestResult();
    result.flowName = 'test flow';
    result.action = 'test action';
    result.id = 100;

    const alert = new Alert();
    alert.id = 101;
    alert.flowName = 'test flow';
    alert.action = 'test action';

    // When
    await save(
      [result],
      {
        orgInfo: defaultOrgContext.orgInfo,
        packagesInfo: defaultOrgContext.packagesInfo,
      },
      [alert]
    );

    // Then
    expect(testSaveStub).to.be.calledOnce;
    expect(orgSaveStub).to.be.calledOnce;
    expect(pkgSaveStub).to.be.calledOnce;
    expect(alertInfoStub).to.be.calledOnce;
    expect(execSaveStub).to.be.calledOnce;
    expect(execSaveStub.args[0][0]).to.have.length(1);
    expect(alertInfoStub.args[0][0][0].testResultId).to.equal(100);
  });

  it('should not save testResultId when flowname and action not match', async () => {
    // Given
    const result = new TestResult();
    result.flowName = 'test flow 1';
    result.action = 'test action 2';
    result.id = 100;

    const alert = new Alert();
    alert.id = 101;
    alert.flowName = 'test flow 2';
    alert.action = 'test action 2';

    // When
    await save(
      [result],
      {
        orgInfo: defaultOrgContext.orgInfo,
        packagesInfo: defaultOrgContext.packagesInfo,
      },
      [alert]
    );

    // Then
    expect(testSaveStub).to.be.calledOnce;
    expect(orgSaveStub).to.be.calledOnce;
    expect(pkgSaveStub).to.be.calledOnce;
    expect(alertInfoStub).to.be.calledOnce;
    expect(execSaveStub).to.be.calledOnce;
    expect(execSaveStub.args[0][0]).to.have.length(1);
    expect(alertInfoStub.args[0][0][0].testResultId).to.equal(-1);
  });
});
