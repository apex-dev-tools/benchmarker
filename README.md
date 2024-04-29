# Benchmarker

A performance testing framework, which orchestrates, profiles and persists stats from test scenarios run on Salesforce Orgs.

## Usage

Available scripts:

* `npm run build` - Clean rebuild ready to pack or run.
* `npm run compile` - Run typescript compile only.
* `npm test` - Run unit tests.
* `npm run test:only --` - Run tests with args passed to mocha.
  * e.g. `npm run test:only -- 'path/to/test.ts' -f 'specific test case'`
  * Pass path/glob to run specific files, use `-f` to match cases.
