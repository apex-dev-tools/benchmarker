# Alerts

Alerts can be stored in the database to track performance degradation over time. The degradation values in each record are the difference from the average result values saved in the last 10 days. If there have not been at least 5 results in the last 10 days, an alert is not stored.

## Usage

### Global Offset Thresholds

Set `STORE_ALERTS` variable in the environment file to `true` to enable alerts globally. If you want to instead enable/disable by individual tests:

```ts
const alertInfo: AlertInfo = new AlertInfo();
alertInfo.storeAlerts = true;

await TransactionProcess.executeTestStep(..., alertInfo);
```

By default, the alert system will use a pre-defined threshold (`offset_threshold`) that applies on top of the 10 day average when it is within a set range (`start_range`, `end_range`). If the limit value is greater than the sum of the 10 day average and the offset threshold, then an alert will be stored.

If you do not want to use the [default ranges](https://github.com/apex-dev-tools/benchmarker/blob/797a57ac45712f079b4a0ce86a15a02f0f12a3b8/src/services/defaultRanges.ts), create your own JSON file with different ranges and give its path via the env file `CUSTOM_RANGES_PATH` variable.

#### Example: Global Offset Threshold

* The measured average CPU Time in the last 10 days was 1500, within a set custom range of 0 - 2000.
* Offset threshold for the range is 3000, applied to the average CPU Time.
* You will get an alert on any value 4500+, saying it has degraded by 3000+ above the average.

```txt
Note: If the average does not match any of the ranges, the 10-day average becomes the threshold. To avoid issues, ensure you have ranges that apply from zero up to governor limits.
```

#### Sample Ranges JSON

Must be at least one range per limit type.

```json
{
  "dml_ranges": [
    {
      "start_range": 0,
      "end_range": 150,
      "offset_threshold": 5
    }
  ],
  "soql_ranges": [
    {
      "start_range": 0,
      "end_range": 100,
      "offset_threshold": 10
    }
  ],
  "cpu_ranges": [
    {
      "start_range": 0,
      "end_range": 10000,
      "offset_threshold": 1500
    }
  ],
  "heap_ranges": [
    {
      "start_range": 0,
      "end_range": 6000000,
      "offset_threshold": 2000000
    }
  ],
  "dmlRows_ranges": [
    {
      "start_range": 0,
      "end_range": 10000,
      "offset_threshold": 2000
    }
  ],
  "queryRows_ranges": [
    {
      "start_range": 0,
      "end_range": 50000,
      "offset_threshold": 5000
    }
  ]
}
```

### Test-Level Thresholds

Another way is to set thresholds at the test level. If the limit value exceeds the custom threshold defined, an alert will be stored. The degradation value is still the difference to the 10 day average, not the threshold value which only determines when an alert is created.

```ts
// Replace global alert behaviour with exact thresholds
const customThresholds: Thresholds = new Thresholds();
customThresholds.cpuTimeThreshold = 0;
customThresholds.dmlRowThreshold = 0;
customThresholds.dmlStatementThreshold = 0;
customThresholds.heapSizeThreshold = 0;
customThresholds.queryRowsThreshold = 0;
customThresholds.soqlQueriesThreshold = 0;

// Enable alerting for this test if not already active
const alertInfo: AlertInfo = new AlertInfo();
alertInfo.storeAlerts = true;
alertInfo.thresholds = customThresholds;

await TransactionProcess.executeTestStep(..., alertInfo);
```

#### Example: Test-Level Threshold

* Threshold at test level for CPU was 4000.
* You will get an alert on any value 4000+, saying it has degraded by X above the average.

```txt
Note: If the test level threshold is misconfigured below the average, you get an alert with a value of 0. Recommend filtering out zero alerts when querying for new records.
```

## UI Alerts

UI Alerts can be stored in the database to monitor performance degradation over time. Each record's degradation value represents the difference between the average component load time of the last 5 days and the average of the 6-to-15-days-ago window. Both windows use timestamp-based boundaries (not calendar days).

A minimum of **10 runs** in the 6-to-15-day baseline window is required before an alert is considered. If either window has no data the comparison is skipped entirely — a missing baseline is never treated as zero.

### Environment Variables

To enable UI alerts globally, set the `STORE_UI_ALERTS` variable to `true` in the environment file

To override the default normal component load time threshold (1000 ms), set the `NORMAL_COMPONENT_LOAD_THRESHOLD` variable to any desired value in the environment file

To override the default critical component load time threshold (10000 ms), set the `CRITICAL_COMPONENT_LOAD_THRESHOLD` variable to any desired value in the environment file

#### Example: UI Alert Global Thresholds

* The average component load time over the last 5 days was 1500 ms, while the 6-to-15-days-ago window averaged 1000 ms.
* You will get a normal alert, saying it has degraded by 500 ms above the baseline.

### UI Test-Level Thresholds

Alternatively, thresholds can be configured at the test level. If the difference between the 5-day average and the 6-to-15-day baseline exceeds the defined custom threshold, an alert will be stored. The degradation value remains the difference between the two averages; the threshold only determines whether an alert is triggered.

```ts
// Replace global alert behaviour with exact thresholds
const customThresholds: UiAlertThresholds = new UiAlertThresholds();
customThresholds.componentLoadTimeThresholdNormal = 50;
customThresholds.componentLoadTimeThresholdCritical = 100;

// Enable alerting for this test if not already active
const alertInfo: UiAlertInfo = new UiAlertInfo();
alertInfo.storeAlerts = true;
alertInfo.uiAlertThresholds = customThresholds;

const testResult: UiTestResultDTO = {
        ...,
        alertInfo,
      };

await saveUiTestResult([testResult]);
```

#### Example: UI Alert Test-Level Thresholds

* Test-level thresholds for normal and critical component load times are set to 50 ms and 100 ms, respectively.
* The 5-day average load time was 1500 ms while the 6-to-15-day baseline averaged 1000 ms.
* You will get a critical alert, saying it has degraded by 500 ms above the baseline.
