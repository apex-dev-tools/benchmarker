/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import pgstr from "pg-connection-string";

export interface PostgresOptions {
  enable?: boolean;
  url?: string;
}

export interface PgDataSourceCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export abstract class PostgresDataSource {
  protected options: PostgresOptions = {};

  abstract get isActive(): boolean;

  abstract connect(options?: PostgresOptions): Promise<void>;

  protected resolveCredentials(): PgDataSourceCredentials | null {
    const url = this.options.url || process.env.BENCH_POSTGRES_URL;

    if (this.options.enable === false || url == null) {
      return null;
    }

    const { host, port, user, password, database } = pgstr.parse(url);

    if (!user || !password || !database) {
      return null;
    }

    return {
      host: host || "localhost",
      port: port ? parseInt(port) : 5432,
      database,
      username: user,
      password,
    };
  }
}
