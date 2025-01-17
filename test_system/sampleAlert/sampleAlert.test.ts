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
} from '../../src';
import { Alert } from '../../src/database/entity/alert';
import { cleanDatabase, getAlerts } from '../database';
import { createSampleAlertTestData } from '../helper';
import { config } from 'dotenv';

describe('Sample Test For Alert Handling', () => {
  let test: TransactionTestTemplate;
  config();

  before(async () => {
    await cleanDatabase();

    if (process.env.STORE_ALERTS === undefined) {
      process.env.STORE_ALERTS = 'true';
    }

    await createSampleAlertTestData(
      'testActionOne',
      'sampleTestFlow',
      'testProduct',
      'unitTest'
    );
    await createSampleAlertTestData(
      'testActionTwo',
      'sampleTestFlow',
      'testProduct',
      'unitTest'
    );
    await createSampleAlertTestData(
      'testActionThree',
      'sampleTestFlow',
      'testProduct',
      'unitTest'
    );
  });

  beforeEach(async () => {
    test = await TransactionProcess.build('testProduct');
  });

  it('should create alert when we used default threshold and store alerts.', async () => {
    // Act
    await TransactionProcess.executeTestStep(
      test,
      await createApexExecutionTestStepFlow(
        test.connection,
        __dirname + '/alert.apex',
        { flowName: 'sampleTestFlow', action: 'testActionOne' }
      )
    );
    await saveResults(test, test.flowStepsResults);

    // Assert
    const alert: Alert[] = await getAlerts('sampleTestFlow', 'testActionOne');
    expect(alert).to.be.ok;
    expect(
      alert,
      `Alert is expected to be an array but it is ${typeof alert}`
    ).to.be.a('array');
    expect(
      alert,
      `Alert is expected to have 1 item but it contains ${alert.length}.`
    ).to.have.lengthOf(1);
    expect(alert.at(0)?.flow_name).to.be.equal('sampleTestFlow');
    expect(alert.at(0)?.action).to.be.equal('testActionOne');
  });

  it('should create alert when we provide a custom threshold and store alerts as true.', async () => {
    // Arrange
    const customThresolds: Thresholds = new Thresholds();
    customThresolds.cpuTimeThreshold = 0;
    customThresolds.dmlRowThreshold = 0;
    customThresolds.dmlStatementThreshold = 10;
    customThresolds.heapSizeThreshold = 0;
    customThresolds.queryRowsThreshold = 0;
    customThresolds.soqlQueriesThreshold = 0;

    const alertInfo: AlertInfo = new AlertInfo();
    alertInfo.storeAlerts = true;
    alertInfo.thresolds = customThresolds;

    // Act
    await TransactionProcess.executeTestStep(
      test,
      await createApexExecutionTestStepFlow(
        test.connection,
        __dirname + '/alert.apex',
        { flowName: 'sampleTestFlow', action: 'testActionTwo' }
      ),
      alertInfo
    );
    await saveResults(test, test.flowStepsResults);

    // Assert
    const alert: Alert[] = await getAlerts('sampleTestFlow', 'testActionTwo');
    expect(alert).to.be.ok;
    expect(
      alert,
      `Alert is expected to be an array but it is ${typeof alert}`
    ).to.be.a('array');
    expect(
      alert,
      `Alert is expected to have 1 item but it contains ${alert.length}.`
    ).to.have.lengthOf(1);
    expect(alert.at(0)?.flow_name).to.be.equal('sampleTestFlow');
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
        __dirname + '/alert.apex',
        { flowName: 'sampleTestFlow', action: 'testActionThree' }
      ),
      alertInfo
    );
    await saveResults(test, test.flowStepsResults);

    // Assert
    const alert: Alert[] = await getAlerts('sampleTestFlow', 'testActionThree');
    expect(alert).to.be.ok;
    expect(
      alert,
      `Alert is expected to be an array but it is ${typeof alert}`
    ).to.be.a('array');
    expect(
      alert,
      `expected to have 0 item in alert array but received ${alert.length}.`
    ).to.have.lengthOf(0);
    expect(alert.at(0)?.flow_name).to.be.equal(undefined);
    expect(alert.at(0)?.action).to.be.equal(undefined);
  });
});
