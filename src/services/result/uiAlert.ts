/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import {
  shouldStoreUiAlerts,
  getNormalComponentLoadThreshold,
  getCriticalComponentLoadThreshold,
} from '../../shared/env';
import { getAverageLimitValuesFromDB } from '../../database/uiAlertInfo';
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
    }));

    // Fetch average values
    const preFetchedAverages = await getAverageLimitValuesFromDB(
      suiteAndTestNamePairs
    );

    // Generate alerts
    const alerts = await Promise.all(
      needToStoreAlert.map(async item =>
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
      avg_first_5: number;
      avg_next_10: number;
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

  //storing alerts if there is a degradation
  const normalComponentLoadThreshold: number = output.alertInfo
    ?.uiAlertThresholds
    ? output.alertInfo.uiAlertThresholds.componentLoadTimeThresholdNormal
    : Number(getNormalComponentLoadThreshold());
  const criticalComponentLoadThreshold: number = output.alertInfo
    ?.uiAlertThresholds
    ? output.alertInfo.uiAlertThresholds.componentLoadTimeThresholdCritical
    : Number(getCriticalComponentLoadThreshold());
  const componentLoadThresholdDegraded = Math.abs(
    averageResults.avg_first_5 - averageResults.avg_next_10
  );

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
