# Alerts

Alerts can be stored in the database to track performance degradation over time. The degradation values in each record are the difference from the average result value saved in the last 10 days. If there have not been at least 5 results in the last 10 days, an alert is not stored.

## Usage

### Global Offset Thresholds

Set `STORE_ALERTS` variable in the environment file to `true` to enable alerts globally. If you want to enable/disable by individual tests:

```ts
const alertInfo: AlertInfo = new AlertInfo();
alertInfo.storeAlerts = false;

await TransactionProcess.executeTestStep(..., alertInfo);
```

By default, the alert system will use a pre-defined threshold (`offset_threshold`) that applies on top of the 10 day average when it is within a set range (`start_range`, `end_range`). If the limit value is greater than the sum of the 10 day average and the offset threshold, then an alert will be stored.

If you do not want to use the [default ranges](https://github.com/apex-dev-tools/benchmarker/blob/797a57ac45712f079b4a0ce86a15a02f0f12a3b8/src/services/defaultRanges.ts), create your own JSON file with different ranges and give its path via the env file `CUSTOM_RANGES_PATH` variable.

#### Example Scenario

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

### Test Level Thresholds

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

const alertInfo: AlertInfo = new AlertInfo();
alertInfo.storeAlerts = true;
alertInfo.thresholds = customThresholds;

await TransactionProcess.executeTestStep(..., alertInfo);
```

#### Example Scenario

* Threshold at test level for CPU was 4000.
* You will get an alert on any value 4000+, saying it has degraded by X above the average.

```txt
Note: If the test level threshold is misconfigured below the average, you get an alert with a value of 0. Recommend filtering out zero alerts when querying for new records.
```
