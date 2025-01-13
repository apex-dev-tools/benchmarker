/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonSpy, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import * as execInfo from '../../src/database/executionInfo';
import * as pkgInfo from '../../src/database/packageInfo';
import * as orgInfo from '../../src/database/orgInfo';
import * as testResult from '../../src/database/testResult';
import * as outputModule from '../../src/services/result/output';
import { Timer } from '../../src/shared/timer';
import { reportResults } from '../../src/services/result';
import { OrgContext } from '../../src/services/org/context';
import { TableReporter } from '../../src/services/result/table';
import { PackageInfo } from '../../src/database/entity/package';
import { Package } from '../../src/services/org/packages';
import * as envModule from '../../src/shared/env';
import { Alert } from '../../src/database/entity/alert';

chai.use(sinonChai);
chai.use(chaiAsPromised);

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
  packagesInfo: [],
};

describe('src/services/result', () => {
  let logSpy: SinonSpy;
  let errorSpy: SinonSpy;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    outputModule.clearReporters();

    logSpy = sinon.spy(console, 'log');
    errorSpy = sinon.spy(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Reporters', () => {
    it('TableReporter should print available data', async () => {
      // Given
      outputModule.addReporter(new TableReporter());
      const timer = new Timer('');
      const testResult: outputModule.TestResultOutput = {
        timer: timer,
        action: 'action',
        flowName: 'flow',
        product: '',
        testType: '',
      };

      // When
      await reportResults([testResult], defaultOrgContext);

      // Then
      expect(logSpy).to.be.called;
      expect(logSpy).to.be.calledWithMatch(/flow.*action.*-1/);
    });

    it('TableReporter should print all tables', async () => {
      // Given
      outputModule.addReporter(new TableReporter());
      const testResult: outputModule.TestResultOutput = {
        timer: new Timer(''),
        action: 'action',
        flowName: 'flow',
        product: '',
        testType: '',
      };
      const testResult2: outputModule.TestResultOutput = {
        timer: new Timer(''),
        action: 'action2',
        flowName: 'flow2',
        product: '',
        testType: '',
        lines: 10,
        documents: 1,
        cpuTime: 250,
        dmlRows: 3,
        dmlStatements: 3,
        heapSize: 100,
        queryRows: 3,
        soqlQueries: 1,
      };
      const testResult3: outputModule.TestResultOutput = {
        timer: new Timer(''),
        action: 'action3',
        flowName: 'flow3',
        product: '',
        testType: '',
        error: 'error',
      };

      // When
      await reportResults(
        [testResult, testResult2, testResult3],
        defaultOrgContext
      );

      // Then
      expect(logSpy).to.be.called;
      expect(logSpy).to.be.calledWithMatch(/flow.*action.*-1/);
      expect(logSpy).to.be.calledWithMatch(
        /flow2.*action2.*10.*1.*-1.*250.*3.*3.*100.*3.*1/
      );
      expect(logSpy).to.be.calledWithMatch(/flow3.*action3.*error/);
    });

    it('should display errors with reporter', async () => {
      // Given
      const errReporter: outputModule.BenchmarkReporter = {
        name: 'Error',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async report(results) {
          throw new Error('problem');
        },
      };
      outputModule.addReporter(errReporter);

      // When
      await reportResults([], defaultOrgContext);

      // Then
      expect(errorSpy).to.be.calledOnce;
      expect(errorSpy).to.be.calledWithMatch(
        "Error running reporter 'Error': problem"
      );
    });
  });

  describe('Database save', () => {
    let testSaveStub: SinonStub;
    let orgIdStub: SinonStub;
    let orgSaveStub: SinonStub;
    let pkgIdStub: SinonStub;
    let pkgSaveStub: SinonStub;
    let execSaveStub: SinonStub;

    const defaultTestResults: outputModule.TestResultOutput[] = [
      {
        timer: new Timer(''),
        action: 'action',
        flowName: 'flow',
        product: '',
        testType: '',
      },
    ];

    beforeEach(() => {
      process.env.DATABASE_URL = 'test';

      testSaveStub = sinon.stub(testResult, 'saveTestResult');
      orgIdStub = sinon.stub(orgInfo, 'getOrgInfoById');
      orgSaveStub = sinon.stub(orgInfo, 'saveOrgInfo');
      pkgIdStub = sinon.stub(pkgInfo, 'getPackagesByVersionId');
      pkgSaveStub = sinon.stub(pkgInfo, 'savePackageInfo');
      execSaveStub = sinon.stub(execInfo, 'saveExecutionInfo');

      testSaveStub.resolvesArg(0);
      orgIdStub.resolves(null);
      orgSaveStub.resolvesArg(0);
      pkgIdStub.resolves([]);
      pkgSaveStub.resolvesArg(0);
      execSaveStub.resolvesArg(0);
    });

    it('should save all records from a test run, without packages', async () => {
      // Given
      // When
      await reportResults(defaultTestResults, defaultOrgContext);

      // Then
      expect(testSaveStub).to.be.calledOnce;
      expect(orgIdStub).to.be.calledOnceWith('123', '45');
      expect(orgSaveStub).to.be.calledOnce;
      expect(pkgIdStub).to.be.calledOnceWith([]);
      expect(pkgSaveStub).to.be.calledOnce;
      expect(execSaveStub).to.be.calledOnce;
      expect(execSaveStub.args[0][0][0].packageInfoId).to.eql(-1);
    });

    it('should save all records from a test run, with packages', async () => {
      // Given
      // When
      await reportResults(defaultTestResults, {
        orgInfo: defaultOrgContext.orgInfo,
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
      });

      // Then
      expect(testSaveStub).to.be.calledOnce;
      expect(orgIdStub).to.be.calledOnceWith('123', '45');
      expect(orgSaveStub).to.be.calledOnce;
      expect(pkgIdStub).to.be.calledOnceWith(['12']);
      expect(pkgSaveStub).to.be.calledOnce;
      expect(execSaveStub).to.be.calledOnce;
      expect(execSaveStub.args[0][0]).to.have.length(1);
      expect(execSaveStub.args[0][0][0].packageInfoId).to.eql(0);
    });

    it('should save all records filtering existing packages', async () => {
      // Given
      const pkg = new PackageInfo();
      pkg.packageVersionId = '11';
      pkgIdStub.resolves([pkg]);

      const expectedPackage: Package = {
        packageVersion: '1.200',
        packageName: 'Test 2',
        packageVersionId: '12',
        packageId: '12345',
        isBeta: false,
        betaName: -1,
      };

      // When
      await reportResults(defaultTestResults, {
        orgInfo: defaultOrgContext.orgInfo,
        packagesInfo: [
          {
            packageVersion: '1.200',
            packageName: 'Test 1',
            packageVersionId: '11',
            packageId: '1234',
            isBeta: false,
            betaName: -1,
          },
          expectedPackage,
        ],
      });

      // Then
      expect(testSaveStub).to.be.calledOnce;
      expect(orgIdStub).to.be.calledOnceWith('123', '45');
      expect(orgSaveStub).to.be.calledOnce;
      expect(pkgIdStub).to.be.calledOnceWith(['11', '12']);
      expect(pkgSaveStub).to.be.calledOnce;
      expect(pkgSaveStub.args[0][0]).to.have.length(1);
      expect(pkgSaveStub.args[0][0][0].packageVersionId).to.eql('12');
      expect(execSaveStub).to.be.calledOnce;
    });

    it('should report and throw error when unable to save', async () => {
      // Given
      const err = new Error('problem');
      testSaveStub.resetBehavior();
      testSaveStub.rejects(err);

      // When
      await expect(reportResults([], defaultOrgContext)).to.be.rejectedWith(
        err
      );

      // Then
      expect(testSaveStub).to.be.calledOnce;
      expect(errorSpy).to.be.calledOnce;
    });

    it('should generate and log alerts when valid alerts are present1', async () => {
      // Given a mock TestResultOutput
      const testResultOutput: outputModule.TestResultOutput = {
        timer: new Timer(''),
        action: 'action',
        flowName: 'flow',
        product: 'product',
        testType: 'test',
        cpuTime: 60,
        dmlRows: 150,
        dmlStatements: 100,
        heapSize: 400,
        queryRows: 200,
        soqlQueries: 10,
        alertInfo: {
          thresolds: {
            cpuTimeThreshold: 50,
            dmlRowThreshold: 10,
            dmlStatementThreshold: 8,
            heapSizeThreshold: 35,
            queryRowsThreshold: 15,
            soqlQueriesThreshold: 2,
          },
          storeAlerts: true,
        },
      };

      // Stub getAlertByComparingAverage to return a mock Alert object
      const mockAlert = new Alert();
      mockAlert.cpuTimeDegraded = 10;
      mockAlert.dmlRowsDegraded = 0;
      mockAlert.dmlStatementsDegraded = 0;
      mockAlert.heapSizeDegraded = 0;
      mockAlert.queryRowsDegraded = 0;
      mockAlert.soqlQueriesDegraded = 0;

      const getAlertStub = sinon
        .stub(outputModule, 'addAlertByComparingAvg')
        .resolves(mockAlert);

      // When
      await reportResults([testResultOutput], defaultOrgContext);

      // Then
      expect(logSpy).to.have.been.called;
      expect(getAlertStub).to.have.been.calledOnceWithExactly(
        testResultOutput,
        sinon.match.object,
        sinon.match.object
      );

      getAlertStub.restore();
    });

    it('should skip generating alerts when storeAlerts is false', async () => {
      // Given
      const testResultOutput: outputModule.TestResultOutput = {
        timer: new Timer(''),
        action: 'action',
        flowName: 'flow',
        product: '',
        testType: '',
      };

      sinon.stub(envModule, 'shouldStoreAlerts').returns(false);

      // Stub getAlertByComparingAverage to return a mock Alert object
      const mockAlert = new Alert();
      mockAlert.cpuTimeDegraded = 10;
      mockAlert.dmlRowsDegraded = 0;
      mockAlert.dmlStatementsDegraded = 0;
      mockAlert.heapSizeDegraded = 0;
      mockAlert.queryRowsDegraded = 0;
      mockAlert.soqlQueriesDegraded = 0;

      const getAlertStub = sinon
        .stub(outputModule, 'addAlertByComparingAvg')
        .resolves(mockAlert);

      // When
      await reportResults([testResultOutput], defaultOrgContext);

      // Then
      expect(getAlertStub).not.to.be.called;
      expect(logSpy).not.to.be.calledWithMatch(/cpuTimeDegraded/);
    });

    it('should handle no alerts gracefully', async () => {
      // Given
      const testResultOutput: outputModule.TestResultOutput = {
        timer: new Timer(''),
        action: 'action',
        flowName: 'flow',
        product: '',
        testType: '',
      };

      sinon.stub(envModule, 'shouldStoreAlerts').returns(true);

      // Stub getAlertByComparingAverage to return a mock Alert object
      const mockAlert = new Alert();
      mockAlert.cpuTimeDegraded = 0;
      mockAlert.dmlRowsDegraded = 0;
      mockAlert.dmlStatementsDegraded = 0;
      mockAlert.heapSizeDegraded = 0;
      mockAlert.queryRowsDegraded = 0;
      mockAlert.soqlQueriesDegraded = 0;

      const getAlertStub = sinon
        .stub(outputModule, 'addAlertByComparingAvg')
        .resolves(mockAlert);

      // When
      await reportResults([testResultOutput], defaultOrgContext);

      // Then
      expect(getAlertStub).to.be.called;
      expect(logSpy).not.to.be.calledWithMatch(/Degraded/);
      getAlertStub.restore();
    });
  });
});
