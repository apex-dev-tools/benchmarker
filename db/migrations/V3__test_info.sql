CREATE TABLE IF NOT EXISTS performance.test_info (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    flow_name text,
    action text,
    product text,
    additional_data text
);

ALTER TABLE performance.test_result add column IF NOT EXISTS source_ref text;