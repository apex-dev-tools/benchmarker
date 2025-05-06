/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import pgstr from 'pg-connection-string';
import { PostgresCommonDataMapper } from './interop';

export interface PostgresOptions {
  enable?: boolean;
  url?: string;
}

export interface DataSourceCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export abstract class PostgresDataSource {
  protected options: PostgresOptions = {};

  abstract get isConnected(): boolean;

  abstract get commonMapper(): PostgresCommonDataMapper | undefined;

  abstract connect(options?: PostgresOptions): Promise<void>;

  protected resolveCredentials(): DataSourceCredentials | null {
    const url = this.options.url || process.env.BENCH_POSTGRES_URL;

    if (this.options.enable === false || url == null) {
      return null;
    }

    const { host, port, user, password, database } = pgstr.parse(url);

    if (!user || !password || !database) {
      return null;
    }

    return {
      host: host || 'localhost',
      port: port ? parseInt(port) : 5432,
      database,
      username: user,
      password,
    };
  }
}
