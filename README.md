# Benchmarker

A performance testing framework, which orchestrates, profiles, and persists stats from test scenarios run on Salesforce orgs.

## Usage

Tests are executed using different templates in a JavaScript testing framework (For example, Mocha, Jest). Results are saved to a provided PostgreSQL database. Also if you want to store alerts for performance degradations, then that can be also stored in the database by enabling the `STORE_ALERTS` in the env file.

The `TransactionTestTemplate` calls a function (`FlowStep`, most often created by helpers) to execute some anonymous Apex code provided for the test. The Apex can come from a file or inline as a string. This Apex code can also collect Governor limit metrics which will be extracted at the end of the test. After all tests are complete, data attributed to the template can be saved. For a sample execution, see `test_system/basic.test.ts`. Other test templates include a boilerplate for running asynchronous batch processes and form or page loading.

## Alerts

Alerts are stored in a database to track performance degradation. The `STORE_ALERTS` in the environment file should be `true` to store alerts in the database.

Alerts are calculated in two ways:

1. Reading Thresholds from JSON: There is a default JSON file, that is,`rangeConfig.JSON` in which different ranges are defined with their `start_range`, `end_range`, and `threshold`. If you do not want to use the default JSON file, you can also create your JSON with different ranges and give its path via the env file `CUSTOM_RANGES_PATH` variable.

*Note: For more information, see  `rangeConfig.json` for creating any new ranges JSON file. The format needs to be the same.

2. Giving Custom Thresholds: Another way is to give custom thresholds at the test level. Along with custom thresholds, you can also pass whether you want to store alerts for a particular test using the alertInfo call. For reference, you can see the `test_system/sampleAlert/sampleAlert.test.ts`.

### How the Store Alerts in the database work?

1. When reading thresholds from JSON file: If current test run limits are greater than the average limits of the previous 10 days, then the alert will be stored.

1. When reading the custom thresholds: If current test run limits are greater than the custom thresholds defined, the alert will be stored in that case.

## Development

### Building

Available scripts:

* `npm run build` - Clean rebuild ready to pack or run.
* `npm run compile` - Run typescript compile only.
* `npm test` - Run unit tests.
* `npm run test:only --` - Run tests with args passed to mocha.
  * e.g. `npm run test:only -- 'path/to/test.ts' -f 'specific test case'`
  * Pass path/glob to run specific files, use `-f` to match cases.

### Testing

Running system tests requires a Salesforce Org and Docker. The instructions below assume you have installed Docker, Salesforce CLI, and have a Dev Hub set up. To use another type of org, multiple environment variables need setting with credentials, see `.env.example` and `test_system/.env`.

1. Create a scratch org:

    ```sh
    sf org create scratch -f test_system/config/scratch-org.json -a bench_testing
    ```

1. Start the docker database with `docker compose up -d`. It is accessible by the host on port 5433, and via adminer control panel at `localhost:8081` to review results.

1. (Run once) Init system test env file with `npm run test:system:init`. Uncomment `SFDX_USERNAME=` and update to `SFDX_USERNAME=bench_testing`, Uncomment `STORE_ALERTS` and update to `STORE_ALERTS=true` if you want to store alerts in case of performance degradation. 

1. Finally, run tests:

    ```sh
    npm run test:system
    ```

## License

All the source code included uses a 3-clause BSD license, see LICENSE for details.
