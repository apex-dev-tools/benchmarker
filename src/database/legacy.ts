/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { DataSource } from "typeorm";
import type { PostgresCommonDataMapper } from "./interop.js";
import { Alert } from "./legacy/entity/alert.js";
import { ExecutionInfo } from "./legacy/entity/execution.js";
import { TestInfo } from "./legacy/entity/info.js";
import { OrgInfo } from "./legacy/entity/org.js";
import { PackageInfo } from "./legacy/entity/package.js";
import { TestResult } from "./legacy/entity/result.js";
import { LegacyDataMapper } from "./legacy/mapper.js";
import { PostgresDataSource, type PostgresOptions } from "./postgres.js";

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
      type: "postgres",
      entities: [
        TestResult,
        OrgInfo,
        PackageInfo,
        ExecutionInfo,
        Alert,
        TestInfo,
      ],
      schema: "performance",
      synchronize: false,
      logging: false,
      ssl: credentials.host.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
      ...credentials,
    }).initialize();

    this.mapper = new LegacyDataMapper(ds);
  }
}
