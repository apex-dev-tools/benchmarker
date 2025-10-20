CREATE TABLE IF NOT EXISTS performance.ui_alert (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    ui_test_result_id integer,
    alert_type text,
    test_suite_name text,
    individual_test_name text,
    component_load_time_degraded integer
);