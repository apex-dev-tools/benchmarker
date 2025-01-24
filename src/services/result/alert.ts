/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { getRangeCollection, shouldStoreAlerts } from '../../shared/env';
import { getAverageLimitValuesFromDB } from '../../database/alertInfo';
import { Alert } from '../../database/entity/alert';
import { addAlertByComparingAvg, TestResultOutput } from './output';

export async function generateValidAlerts(
  testResultOutput: TestResultOutput[]
): Promise<Alert[]> {
  const needToStoreAlert = testResultOutput.filter(result => {
    const testLevel = result.alertInfo?.storeAlerts;
    return testLevel || (testLevel !== false && shouldStoreAlerts());
  });

  if (needToStoreAlert.length === 0) {
    return [];
  }

  try {
    // Extract flow-action pairs
    const flowActionPairs = needToStoreAlert.map(result => ({
      flowName: result.flowName,
      actionName: result.action,
    }));

    // Fetch average values
    const preFetchedAverages =
      await getAverageLimitValuesFromDB(flowActionPairs);
    const rangeCollection = getRangeCollection();

    // Generate alerts
    const alerts = await Promise.all(
      needToStoreAlert.map(async item =>
        addAlertByComparingAvg(item, preFetchedAverages, rangeCollection)
      )
    );

    // Filter valid alerts (non-null and degraded)
    return alerts.filter((alert): alert is Alert => {
      return (
        alert.cpuTimeDegraded > 0 ||
        alert.dmlRowsDegraded > 0 ||
        alert.dmlStatementsDegraded > 0 ||
        alert.heapSizeDegraded > 0 ||
        alert.queryRowsDegraded > 0 ||
        alert.soqlQueriesDegraded > 0
      );
    });
  } catch (err) {
    console.error('Error generating alerts:', err);
    return [];
  }
}
