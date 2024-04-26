CREATE SCHEMA IF NOT EXISTS performance;

CREATE TABLE IF NOT EXISTS performance.execution_info (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    org_info_id integer,
    package_info_id integer,
    test_result_id integer,
    external_build_id text
);

CREATE TABLE IF NOT EXISTS performance.org_info (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    org_id text,
    release_version text,
    api_version text,
    org_type text,
    instance text,
    is_lex boolean,
    is_multicurrency boolean,
    is_sandbox boolean,
    is_trial boolean
);

CREATE TABLE IF NOT EXISTS performance.package_info (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    package_name text,
    package_version text,
    package_version_id text,
    package_id text,
    is_beta boolean,
    beta_name integer
);

CREATE TABLE IF NOT EXISTS performance.test_result (
    id serial PRIMARY KEY,
    create_date_time timestamp without time zone DEFAULT now() NOT NULL,
    update_date_time timestamp without time zone DEFAULT now() NOT NULL,
    duration integer,
    action text,
    flow_name text,
    error text,
    target_value integer,
    product text,
    incognito_browser boolean,
    speed_index integer,
    time_to_interactive integer,
    dlp_lines integer,
    dp_documents integer,
    test_type text,
    cpu_time integer,
    dml_rows integer,
    dml_statements integer,
    heap_size integer,
    query_rows integer,
    soql_queries integer
);
