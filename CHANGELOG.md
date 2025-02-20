# Benchmarker - Changelog

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
