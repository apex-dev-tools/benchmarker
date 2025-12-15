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
  getAverageLimitValuesFromDB,
  checkRecentUiAlerts,
} from '../../database/uiAlertInfo';
import { UiAlert } from '../../database/entity/uiAlert';
import { UiTestResultDTO } from '../../database/uiTestResult';
import { CRITICAL } from '../../shared/constants';

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
    }));

    const existingAlerts = await checkRecentUiAlerts(suiteAndTestNamePairs);

    const alertsToProcess = needToStoreAlert.filter(
      item =>
        !existingAlerts.has(`${item.testSuiteName}_${item.individualTestName}`)
    );

    if (alertsToProcess.length === 0) {
      return [];
    }

    // Fetch average values
    const preFetchedAverages = await getAverageLimitValuesFromDB(
      suiteAndTestNamePairs
    );

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
      avg_load_time_past_5_days: number;
      avg_load_time_6_to_15_days_ago: number;
    };
  }
): Promise<UiAlert> {
  const alert: UiAlert = new UiAlert();
  alert.testSuiteName = output.testSuiteName;
  alert.individualTestName = output.individualTestName;

  // Construct the key for the current individualTestName and testSuiteName
  const key = `${output.testSuiteName}_${output.individualTestName}`;

  const averageResults = preFetchedAverages[key];

  if (!averageResults) {
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
  const componentLoadThresholdDegraded = Math.abs(
    averageResults.avg_load_time_past_5_days -
      averageResults.avg_load_time_6_to_15_days_ago
  );

  if (
    componentLoadThresholdDegraded >= normalComponentLoadThreshold &&
    componentLoadThresholdDegraded < criticalComponentLoadThreshold
  ) {
    alert.componentLoadTimeDegraded = componentLoadThresholdDegraded;
  } else if (componentLoadThresholdDegraded >= criticalComponentLoadThreshold) {
    alert.componentLoadTimeDegraded = componentLoadThresholdDegraded;
    alert.alertType = CRITICAL;
  }

  return alert;
}
