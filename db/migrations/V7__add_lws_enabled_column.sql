ALTER TABLE performance.ui_test_result add column IF NOT EXISTS lws_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE performance.ui_alert add column IF NOT EXISTS lws_enabled boolean NOT NULL DEFAULT false;
