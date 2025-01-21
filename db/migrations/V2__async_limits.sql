ALTER TABLE test_result add column IF NOT EXISTS queueable_jobs integer;
ALTER TABLE test_result add column IF NOT EXISTS future_calls integer;

CREATE TABLE IF NOT EXISTS performance.alert (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    test_result_id integer,
    flow_name text,
    action text,
    cpu_time_degraded integer,
    dml_rows_degraded integer,
    dml_statements_degraded integer,
    heap_size_degraded integer,
    query_rows_degraded integer,
    soql_queries_degraded integer
);