/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import * as dotenv from "dotenv";
import type { PostgresCommonDataMapper } from "../database/interop.js";
import { LegacyDataSource } from "../database/legacy.js";
import type {
  PostgresDataSource,
  PostgresOptions,
} from "../database/postgres.js";
import { BenchmarkOrg, type OrgOptions } from "../salesforce/org.js";

export interface GlobalOptions {
  // id/name for current run e.g. build number
  buildId?: string;

  // id/name for project / product - mark created records
  projectId?: string;

  // id/name for git ref - mark created records
  sourceId?: string;

  // path to custom env - default: cwd/.env
  envFile?: string;
}

export interface RunContextOptions {
  global?: GlobalOptions;
  org?: OrgOptions;
  pg?: PostgresOptions;
}

export class RunContext {
  projectId: string;
  org: BenchmarkOrg;
  pg: PostgresDataSource;
  pgLegacy?: LegacyDataSource;
  buildId?: string;
  sourceId?: string;

  constructor() {
    this.org = new BenchmarkOrg();
    this.pg = new LegacyDataSource(); // TODO new schema
    this.projectId = "";
  }

  static get current(): RunContext {
    return context;
  }

  static reset(): void {
    context = new RunContext();
  }

  static replace<R extends RunContext>(ext: R): void {
    context = ext;
  }

  async setup(options: RunContextOptions = {}): Promise<RunContext> {
    this.loadEnv(options.global);

    await this.org.connect(options.org);
    await this.pg.connect({ enable: false }); // TODO new schema

    return this;
  }

  async setupPgLegacy(options?: PostgresOptions): Promise<void> {
    if (!this.pgLegacy?.isConnected) {
      this.pgLegacy = new LegacyDataSource();
      await this.pgLegacy.connect(options);
    }
  }

  isPostgresAvailable(): boolean {
    return this.pg.isConnected || this.pgLegacy?.isConnected || false;
  }

  async forPostgres(
    op: (ds: PostgresCommonDataMapper) => Promise<void>
  ): Promise<void> {
    for (const mapper of [this.pg.commonMapper, this.pgLegacy?.commonMapper]) {
      if (mapper) await op(mapper);
    }
  }

  protected loadEnv(global: GlobalOptions = {}) {
    if (this.projectId.length != 0) return;

    dotenv.config({ path: global.envFile || ".env", quiet: true });

    const id = global.projectId || process.env.BENCH_PROJECT_ID;
    if (id == null || id.length == 0) {
      throw new Error("global.projectId or $BENCH_PROJECT_ID env is required");
    }

    this.projectId = id;
    this.buildId = global.buildId || process.env.BENCH_BUILD_ID;
    this.sourceId = global.sourceId || process.env.BENCH_SOURCE_ID;
  }
}

let context: RunContext = new RunContext();
