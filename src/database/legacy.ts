/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { LegacyDataMapper } from './legacy/mapper';
import { DataSource } from 'typeorm';
import { TestResult } from './legacy/entity/result';
import { OrgInfo } from './legacy/entity/org';
import { PackageInfo } from './legacy/entity/package';
import { ExecutionInfo } from './legacy/entity/execution';
import { Alert } from './legacy/entity/alert';
import { PostgresDataSource, PostgresOptions } from './postgres';
import { PostgresCommonDataMapper } from './interop';

export class LegacyDataSource extends PostgresDataSource {
  mapper?: LegacyDataMapper;

  get isConnected(): boolean {
    return this.mapper != null;
  }

  get commonMapper(): PostgresCommonDataMapper | undefined {
    return this.mapper;
  }

  async connect(options: PostgresOptions = {}): Promise<void> {
    if (this.mapper) return;

    this.options = options;

    const credentials = this.resolveCredentials();
    if (!credentials) return;

    const ds = await new DataSource({
      type: 'postgres',
      entities: [TestResult, OrgInfo, PackageInfo, ExecutionInfo, Alert],
      schema: 'performance',
      synchronize: false,
      logging: false,
      ssl: credentials.host.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
      ...credentials,
    }).initialize();

    this.mapper = new LegacyDataMapper(ds);
  }
}
