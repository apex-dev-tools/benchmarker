/**
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import {
  AlertInfo,
  createApexExecutionTestStepFlow,
  saveResults,
  Thresholds,
  TransactionProcess,
  TransactionTestTemplate,
} from '../src/index.js';
import { Alert } from '../src/database/legacy/entity/alert.js';
import {
  cleanDatabase,
  createSampleAlertTestData,
  loadAlerts,
  loadEnv,
  restore,
} from './helper.js';

describe('alert', () => {
  let test: TransactionTestTemplate;

  before(async () => {
    restore();
    loadEnv({
      BENCH_METRICS: 'true',
      BENCH_POSTGRES_LEGACY: 'true',
    });

    test = await TransactionProcess.build('testProduct');

    await cleanDatabase();

    await createSampleAlertTestData(
      'testActionOne',
      'sampleTestFlow',
      'testProduct',
      'Transaction Process'
    );
    await createSampleAlertTestData(
      'testActionTwo',
      'sampleTestFlow',
      'testProduct',
      'Transaction Process'
    );
    await createSampleAlertTestData(
      'testActionThree',
      'sampleTestFlow',
      'testProduct',
      'Transaction Process'
    );
  });

  it('should create alert when we used default threshold and store alerts.', async () => {
    // Act
    await TransactionProcess.executeTestStep(
      test,
      await createApexExecutionTestStepFlow(
        test.connection,
        __dirname + '/scripts/alert.apex',
        { flowName: 'sampleTestFlow', action: 'testActionOne' }
      )
    );
    await saveResults(test, test.flowStepsResults);

    // Assert
    const alert: Alert[] = await loadAlerts('sampleTestFlow', 'testActionOne');
    expect(alert).to.be.ok;
    expect(
      alert,
      `Alert is expected to be an array but it is ${typeof alert}`
    ).to.be.a('array');
    expect(
      alert,
      `Alert is expected to have 1 item but it contains ${alert.length}.`
    ).to.have.lengthOf(1);
    expect(alert.at(0)?.flowName).to.be.equal('sampleTestFlow');
    expect(alert.at(0)?.action).to.be.equal('testActionOne');
  });

  it('should create alert when we provide a custom threshold and store alerts as true.', async () => {
    // Arrange
    const customThresholds: Thresholds = new Thresholds();
    customThresholds.cpuTimeThreshold = 0;
    customThresholds.dmlRowThreshold = 0;
    customThresholds.dmlStatementThreshold = 10;
    customThresholds.heapSizeThreshold = 0;
    customThresholds.queryRowsThreshold = 0;
    customThresholds.soqlQueriesThreshold = 0;

    const alertInfo: AlertInfo = new AlertInfo();
    alertInfo.storeAlerts = true;
    alertInfo.thresholds = customThresholds;

    // Act
    await TransactionProcess.executeTestStep(
      test,
      await createApexExecutionTestStepFlow(
        test.connection,
        __dirname + '/scripts/alert.apex',
        { flowName: 'sampleTestFlow', action: 'testActionTwo' }
      ),
      alertInfo
    );
    await saveResults(test, test.flowStepsResults);

    // Assert
    const alert: Alert[] = await loadAlerts('sampleTestFlow', 'testActionTwo');
    expect(alert).to.be.ok;
    expect(
      alert,
      `Alert is expected to be an array but it is ${typeof alert}`
    ).to.be.a('array');
    expect(
      alert,
      `Alert is expected to have 1 item but it contains ${alert.length}.`
    ).to.have.lengthOf(1);
    expect(alert.at(0)?.flowName).to.be.equal('sampleTestFlow');
    expect(alert.at(0)?.action).to.be.equal('testActionTwo');
  });

  it('should not create alert when we set store alerts as false.', async () => {
    // Arrange
    const alertInfo: AlertInfo = new AlertInfo();
    alertInfo.storeAlerts = false;

    // Act
    await TransactionProcess.executeTestStep(
      test,
      await createApexExecutionTestStepFlow(
        test.connection,
        __dirname + '/scripts/alert.apex',
        { flowName: 'sampleTestFlow', action: 'testActionThree' }
      ),
      alertInfo
    );
    await saveResults(test, test.flowStepsResults);

    // Assert
    const alert: Alert[] = await loadAlerts(
      'sampleTestFlow',
      'testActionThree'
    );
    expect(alert).to.be.ok;
    expect(
      alert,
      `Alert is expected to be an array but it is ${typeof alert}`
    ).to.be.a('array');
    expect(
      alert,
      `expected to have 0 item in alert array but received ${alert.length}.`
    ).to.have.lengthOf(0);
  });
});
