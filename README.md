# Benchmarker

A performance testing framework, which orchestrates, profiles, and persists stats from test scenarios run on Salesforce orgs.

## Usage

Tests are executed using different templates in a JavaScript testing framework (For example, Mocha, Jest). Results are saved to a provided PostgreSQL database. Alerts for performance degradations can be stored in the database by setting `STORE_ALERTS` in the env file. See [the alerts documentation](./docs/user/alerts.md) for more details.

The `TransactionTestTemplate` calls a function (`FlowStep`, most often created by helpers) to execute some anonymous Apex code provided for the test. The Apex can come from a file or inline as a string. This Apex code can also collect Governor limit metrics which will be extracted at the end of the test. After all tests are complete, data attributed to the template can be saved. For a sample execution, see `test_system/basic.test.ts`.

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

1. (Run once) Init system test env file with `npm run test:system:init`. Uncomment `SFDX_USERNAME=` and update to `SFDX_USERNAME=bench_testing`. Optionally set any other variables for all tests to use, like `STORE_ALERTS`.

1. Finally, run tests:

    ```sh
    npm run test:system
    ```

## License

All the source code included uses a 3-clause BSD license, see LICENSE for details.
