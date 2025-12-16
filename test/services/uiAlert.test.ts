import * as sinon from 'sinon';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';

import { generateValidAlerts } from '../../src/services/result/uiAlert';
import * as env from '../../src/shared/env';
import * as uiAlertInfo from '../../src/database/uiAlertInfo';

import { UiTestResultDTO } from '../../src/database/uiTestResult';
import { CRITICAL } from '../../src/shared/constants';

chai.use(sinonChai);

const MOCK_TEST_DTO_BASE: UiTestResultDTO = {
  testSuiteName: 'ComponentLoadSuite',
  individualTestName: 'ComponentXLoadTime',
  overallLoadTime: 1000,
  componentLoadTime: 500,
  salesforceLoadTime: 500,
  alertInfo: undefined,
} as UiTestResultDTO;

describe('generateValidAlerts', () => {
  let sandbox: sinon.SinonSandbox;
  let storeAlertsStub: sinon.SinonStub;
  let getAveragesStub: sinon.SinonStub;
  let normalThresholdStub: sinon.SinonStub;
  let criticalThresholdStub: sinon.SinonStub;
  let checkRecentStub: sinon.SinonStub;

  before(() => {
    sandbox = sinon.createSandbox();

    storeAlertsStub = sandbox.stub(env, 'shouldStoreUiAlerts');
    normalThresholdStub = sandbox.stub(env, 'getNormalComponentLoadThreshold');
    criticalThresholdStub = sandbox.stub(
      env,
      'getCriticalComponentLoadThreshold'
    );

    getAveragesStub = sandbox.stub(uiAlertInfo, 'getAverageLimitValuesFromDB');
    checkRecentStub = sandbox.stub(uiAlertInfo, 'checkRecentUiAlerts');
  });

  beforeEach(() => {
    sandbox.resetHistory();

    storeAlertsStub.returns(true);
    normalThresholdStub.returns('20');
    criticalThresholdStub.returns('50');
    getAveragesStub.resolves({});
    checkRecentStub.resolves(new Set<string>());
  });

  after(() => {
    sandbox.restore();
  });

  describe('alert eligibility filtering', () => {
    it('should return empty array if global alerts are disabled and no override exists', async () => {
      // Given
      storeAlertsStub.returns(false);

      // When
      const result = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(result).to.be.an('array').that.is.empty;
      expect(getAveragesStub).to.not.have.been.called;
    });

    it('should enable processing if a test explicitly enables alerts (override global disable)', async () => {
      // Given
      storeAlertsStub.returns(false);
      const overriddenTest = {
        ...MOCK_TEST_DTO_BASE,
        alertInfo: { storeAlerts: true },
      } as UiTestResultDTO;

      getAveragesStub.resolves({});

      // When
      await generateValidAlerts([overriddenTest]);

      // Then
      expect(getAveragesStub).to.have.been.calledOnce;
    });

    it('should skip processing if a test explicitly disables alerts (override global enable)', async () => {
      // Given
      storeAlertsStub.returns(true);
      const disabledTest = {
        ...MOCK_TEST_DTO_BASE,
        alertInfo: { storeAlerts: false },
      } as UiTestResultDTO;

      // When
      const results = await generateValidAlerts([disabledTest]);

      // Then
      expect(results).to.be.an('array').that.is.empty;
      expect(getAveragesStub).to.not.have.been.called;
    });
  });

  describe('recent alert filtering', () => {
    const avgFirst5 = 200;
    it('should skip processing if an alert was already triggered for this test in the last 3 days', async () => {
      // Given
      const avgNext10 = 100;
      const mockAverages = {
        ['ComponentLoadSuite_ComponentXLoadTime']: {
          avg_load_time_past_5_days: avgFirst5,
          avg_load_time_6_to_15_days_ago: avgNext10,
        },
      };
      checkRecentStub.resolves(
        new Set(['ComponentLoadSuite_ComponentXLoadTime'])
      );
      getAveragesStub.resolves(mockAverages);

      // When
      const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(results).to.be.an('array').that.is.empty;
      expect(getAveragesStub).to.not.have.been.called;
    });

    it('should process the test normally if no recent alerts exist', async () => {
      // Given
      const avgNext10 = 100;
      const mockAverages = {
        ['ComponentLoadSuite_ComponentXLoadTime']: {
          avg_load_time_past_5_days: avgFirst5,
          avg_load_time_6_to_15_days_ago: avgNext10,
        },
      };
      checkRecentStub.resolves(new Set());
      getAveragesStub.resolves(mockAverages);

      // When
      const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(results).to.have.lengthOf(1);
      expect(getAveragesStub).to.have.been.called;
    });
  });

  describe('alert generation logic', () => {
    const avgFirst5 = 200;

    it('should generate a CRITICAL alert when degradation is greater than critical threshold (50)', async () => {
      //Given
      const avgNext10 = 100;
      const mockAverages = {
        ['ComponentLoadSuite_ComponentXLoadTime']: {
          avg_load_time_past_5_days: avgFirst5,
          avg_load_time_6_to_15_days_ago: avgNext10,
        },
      };
      getAveragesStub.resolves(mockAverages);

      // When
      const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(results).to.have.lengthOf(1);
      expect(results[0].alertType).to.equal(CRITICAL);
      expect(results[0].componentLoadTimeDegraded).to.equal(100);
    });

    it('should generate a NORMAL alert when degradation is between normal (20) and critical (50)', async () => {
      //Given
      const avgNext10 = 165;
      const mockAverages = {
        ['ComponentLoadSuite_ComponentXLoadTime']: {
          avg_load_time_past_5_days: avgFirst5,
          avg_load_time_6_to_15_days_ago: avgNext10,
        },
      };
      getAveragesStub.resolves(mockAverages);

      // When
      const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(results).to.have.lengthOf(1);
      expect(results[0].alertType).to.equal(NORMAL);
      expect(results[0].componentLoadTimeDegraded).to.equal(35);
    });

    it('should return NO alert when degradation is below the normal threshold (20)', async () => {
      // Given
      const avgNext10 = 185;
      const mockAverages = {
        ['ComponentLoadSuite_ComponentXLoadTime']: {
          avg_load_time_past_5_days: avgFirst5,
          avg_load_time_6_to_15_days_ago: avgNext10,
        },
      };
      getAveragesStub.resolves(mockAverages);

      // When
      const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(results).to.be.an('array').that.is.empty;
    });

    it('should return NO alert when historical average data is not found', async () => {
      // Given
      getAveragesStub.resolves({});

      // When
      const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(results).to.be.an('array').that.is.empty;
    });

    it('should return NO alert if degradation is zero', async () => {
      //Given
      const avgNext10 = 200;
      const mockAverages = {
        ['ComponentLoadSuite_ComponentXLoadTime']: {
          avg_load_time_past_5_days: avgFirst5,
          avg_load_time_6_to_15_days_ago: avgNext10,
        },
      };
      getAveragesStub.resolves(mockAverages);

      // When
      const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

      // Then
      expect(results).to.be.an('array').that.is.empty;
    });
  });

  it('should use test-level thresholds if provided, overriding global environment settings', async () => {
    // Given
    const testLevelNormal = 10;
    const testLevelCritical = 30;

    const avgNext10 = 175;
    const mockAverages = {
      ['ComponentLoadSuite_ComponentXLoadTime']: {
        avg_load_time_past_5_days: 200,
        avg_load_time_6_to_15_days_ago: avgNext10,
      },
    };
    getAveragesStub.resolves(mockAverages);

    const testWithOverride = {
      ...MOCK_TEST_DTO_BASE,
      alertInfo: {
        uiAlertThresholds: {
          componentLoadTimeThresholdNormal: testLevelNormal,
          componentLoadTimeThresholdCritical: testLevelCritical,
        },
      },
    } as UiTestResultDTO;

    // When
    const results = await generateValidAlerts([testWithOverride]);

    // Then
    expect(results).to.have.lengthOf(1);
    expect(results[0].alertType).to.equal(NORMAL);
    expect(results[0].componentLoadTimeDegraded).to.equal(25);
    expect(normalThresholdStub).to.not.have.been.called;
  });

  it('should handle errors during average fetching and return an empty array, logging the error', async () => {
    // Given
    const errorStub = sandbox.stub(console, 'error');
    getAveragesStub.rejects(new Error('Database connection failed'));

    // When
    const results = await generateValidAlerts([MOCK_TEST_DTO_BASE]);

    // Then
    expect(results).to.be.an('array').that.is.empty;
    expect(getAveragesStub).to.have.been.calledOnce;
    expect(errorStub).to.have.been.calledWith(
      sinon.match('Error generating alerts')
    );
  });
});
