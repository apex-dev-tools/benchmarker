ALTER TABLE performance.test_result add column IF NOT EXISTS load_time integer;
ALTER TABLE performance.alert add column IF NOT EXISTS load_time_degraded integer;