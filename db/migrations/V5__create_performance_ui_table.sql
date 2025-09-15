CREATE TABLE IF NOT EXISTS performance.ui_test_result (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    test_suite_name text,
    individual_test_name text,
    component_load_time integer,
    salesforce_load_time integer,
    overall_load_time integer
);