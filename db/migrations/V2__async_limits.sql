ALTER TABLE test_result add column IF NOT EXISTS queueable_jobs integer;
ALTER TABLE test_result add column IF NOT EXISTS future_calls integer;