/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import {
  shouldStoreUiAlerts,
  getNormalComponentLoadThreshold,
  getCriticalComponentLoadThreshold,
} from '../../shared/env';
import {
  buildKey,
  getAverageLimitValuesFromDB,
  checkRecentUiAlerts,
} from '../../database/uiAlertInfo';
import { UiAlert } from '../../database/entity/uiAlert';
import { UiTestResultDTO } from '../../database/uiTestResult';
import { NORMAL, CRITICAL } from '../../shared/constants';

export async function generateValidAlerts(
  testResultOutput: UiTestResultDTO[]
): Promise<UiAlert[]> {
  const needToStoreAlert = testResultOutput.filter(result => {
    const testLevel = result.alertInfo?.storeAlerts;
    return testLevel || (testLevel !== false && shouldStoreUiAlerts());
  });

  if (needToStoreAlert.length === 0) {
    return [];
  }

  try {
    // Extract flow-action pairs
    const suiteAndTestNamePairs = needToStoreAlert.map(result => ({
      testSuiteName: result.testSuiteName,
      individualTestName: result.individualTestName,
      lwsEnabled: result.lwsEnabled ?? false,
    }));

    const existingAlerts = await checkRecentUiAlerts(suiteAndTestNamePairs);

    const alertsToProcess = needToStoreAlert.filter(
      item =>
        !existingAlerts.has(
          buildKey(
            item.testSuiteName,
            item.individualTestName,
            item.lwsEnabled ?? false
          )
        )
    );

    if (alertsToProcess.length === 0) {
      return [];
    }

    const alertsToProcessPairs = alertsToProcess.map(result => ({
      testSuiteName: result.testSuiteName,
      individualTestName: result.individualTestName,
      lwsEnabled: result.lwsEnabled ?? false,
    }));
    const preFetchedAverages =
      await getAverageLimitValuesFromDB(alertsToProcessPairs);

    // Generate alerts
    const alerts = await Promise.all(
      alertsToProcess.map(async item =>
        addAlertByComparingAvg(item, preFetchedAverages)
      )
    );

    // Filter valid alerts (non-null and degraded)
    return alerts.filter((alert): alert is UiAlert => {
      return alert.componentLoadTimeDegraded > 0;
    });
  } catch (err) {
    console.error('Error generating alerts:', err);
    return [];
  }
}

async function addAlertByComparingAvg(
  output: UiTestResultDTO,
  preFetchedAverages: {
    [key: string]: {
      avg_load_time_past_5_days: number | null;
      avg_load_time_6_to_15_days_ago: number | null;
    };
  }
): Promise<UiAlert> {
  const alert: UiAlert = new UiAlert();
  alert.testSuiteName = output.testSuiteName;
  alert.individualTestName = output.individualTestName;
  alert.lwsEnabled = output.lwsEnabled ?? false;

  // Construct the key for the current individualTestName and testSuiteName and lwsEnabled
  const key = buildKey(
    output.testSuiteName,
    output.individualTestName,
    output.lwsEnabled ?? false
  );

  const averageResults = preFetchedAverages[key];

  if (!averageResults) {
    return alert;
  }

  // Skip comparison if either window has no data — a null baseline would
  // produce a false degradation signal equal to the raw load time.
  if (
    averageResults.avg_load_time_6_to_15_days_ago == null ||
    averageResults.avg_load_time_past_5_days == null
  ) {
    return alert;
  }

  // Storing alerts if there is a degradation
  const normalComponentLoadThreshold: number = output.alertInfo
    ?.uiAlertThresholds
    ? output.alertInfo.uiAlertThresholds.componentLoadTimeThresholdNormal
    : Number(getNormalComponentLoadThreshold());
  const criticalComponentLoadThreshold: number = output.alertInfo
    ?.uiAlertThresholds
    ? output.alertInfo.uiAlertThresholds.componentLoadTimeThresholdCritical
    : Number(getCriticalComponentLoadThreshold());
  const componentLoadThresholdDegraded =
    averageResults.avg_load_time_past_5_days -
    averageResults.avg_load_time_6_to_15_days_ago;

  if (
    componentLoadThresholdDegraded >= normalComponentLoadThreshold &&
    componentLoadThresholdDegraded < criticalComponentLoadThreshold
  ) {
    alert.componentLoadTimeDegraded = componentLoadThresholdDegraded;
    alert.alertType = NORMAL;
  } else if (componentLoadThresholdDegraded >= criticalComponentLoadThreshold) {
    alert.componentLoadTimeDegraded = componentLoadThresholdDegraded;
    alert.alertType = CRITICAL;
  }

  return alert;
}
