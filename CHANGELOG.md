# Benchmarker - Changelog

## 6.0.0

### Breaking Changes

- Database schema updated: Use `db/migrations/V6__create_performance_ui_alert_table.sql` script to create new table to store alerts for performance UI test results.

## 5.0.0

### Breaking Changes

- Database schema updated: Use `db/migrations/V5__create_performance_ui_table.sql` script to create new table to store performance UI test results.

## 4.0.0

### Breaking Changes

- Database schema updated: Use `db/migrations/V4__source_ref_column.sql` script to upgrade existing PostgreSQL database before using this package version.

### Added

- New environment variable `SOURCE_REF` to set a grouping field (`source_ref`) on the `test_result` table.
  - Intended to be used for source control references, e.g. branch, tag. Though any string is allowed.

## 3.0.0

### Breaking Changes

- Database schema updated: Use `db/migrations/V3__test_info.sql` script to upgrade existing PostgreSQL database before using this package version.

### Added

- New property on `TestStepDescription`, `additionalData`. Provide custom string information to link to results.
  - Stored against `flowName`, `action` and `product` of the test.
  - To set it use `createApexExecutionTestStepFlow(connection, path, { flowName, action, additionalData })`.

- Database update:
  - New table, `test_info`. Columns:
    - `additional_data` - Custom string data recorded by test.
    - `flow_name`
    - `action`
    - `product`

## 2.0.2

- Add retry to `executeAnonymous` call.
- Update reported errors on failed `executeAnonymous` to include original exception.

## 2.0.1

- Fix `typeorm` - `DataSource` `synchronize` option doing database schema overwrite.

## 2.0.0

### Breaking Changes

- Database schema updated: Use `db/migrations/V2__async_limits_and_alert.sql` script to upgrade existing PostgreSQL database before using this package version.

- Minimum Node JS version increased to 20

- Added deprecation warning to unsupported test templates.
  - Everything that isn't used for the `TransactionTestTemplate` will be removed in a future version.
  - This includes re-exported helper types used to assist other test templates.
  - Going forward, only the API for the transaction template will remain for backward compatibility (even after a new API is introduced).

### Added

- New alerts config for global and per test usage. Used for reporting on degradations over time.
  - Configure global behaviour with a JSON file, or per test with new parameter on `TransactionProcess.executeTestStep`.
  - See [the documentation on alerts](./docs/user/alerts.md) for more details.

- Database update:
  - New columns on `test_result` table, captured by transaction template:
    - `queueable_jobs`: Enqueued Jobs limit value
    - `future_calls`: Future method calls limit value
  - New table, `alert`:
    - Each record relates to a `test_result_id`
    - Conditionally inserted if a threshold above average is met
    - Shows the difference above recent 10 day average results
    - Notable columns:
      - `cpu_time_degraded`
      - `dml_rows_degraded`
      - `dml_statements_degraded`
      - `heap_size_degraded`
      - `query_rows_degraded`
      - `soql_queries_degraded`

## 1.0.0

- Initial release.
