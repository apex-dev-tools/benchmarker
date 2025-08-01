/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import * as dotenv from 'dotenv';
import { SinonSandbox, SinonStubbedInstance } from 'sinon';
import { GlobalOptions, RunContext } from '../src/state/context';
import { BenchmarkOrg } from '../src/salesforce/org';
import { PostgresDataSource } from '../src/database/postgres';
import { PostgresCommonDataMapper } from '../src/database/interop';
import { BenchmarkOrgConnection } from '../src/salesforce/org/connection';
import { LegacyDataSource } from '../src/database/legacy';
import { AuthInfo } from '@salesforce/core';
import { type MockTestOrgData } from '@salesforce/core/lib/testSetup';
import { sfTestSetup } from './helpers';
import { GovernorLimits } from '../src/benchmark/limits/schemas';

const envKeys = [
  'BENCH_PROJECT_ID',
  'BENCH_BUILD_ID',
  'BENCH_ORG_USERNAME',
  'BENCH_ORG_PASSWORD',
  'BENCH_ORG_LOGIN_URL',
  'BENCH_ORG_UNMANAGED_NAMESPACES',
  'BENCH_POSTGRES_URL',
  'BENCH_POSTGRES_LEGACY',
  'BENCH_METRICS',
  'BENCH_METRICS_LIMIT_RANGES',
] as const;

export type MockEnv = { [K in (typeof envKeys)[number]]?: string };

export const mockLimits: GovernorLimits = {
  duration: 8,
  cpuTime: 9,
  dmlRows: 0,
  dmlStatements: 0,
  heapSize: 40131,
  queryRows: 0,
  soqlQueries: 0,
  queueableJobs: 0,
  futureCalls: 0,
};

export class MockRunContext extends RunContext {
  sandbox: SinonSandbox;
  orgMockData: MockTestOrgData;

  constructor(sandbox: SinonSandbox) {
    super();
    this.sandbox = sandbox;
    this.orgMockData = new sfTestSetup.MockTestOrgData();
  }

  static createMock(sandbox: SinonSandbox): MockRunContext {
    const mock = new MockRunContext(sandbox);
    RunContext.replace(mock);
    return mock;
  }

  static reset(): void {
    MockRunContext.clearEnv();
    RunContext.reset();
  }

  static replaceEnv(env: MockEnv): void {
    dotenv.populate(process.env as dotenv.DotenvPopulateInput, env, {
      override: true,
    });
  }

  static clearEnv(): void {
    for (const key of envKeys) {
      delete process.env[key];
    }
  }

  stubGlobals(opts?: GlobalOptions): void {
    if (opts) {
      this.projectId = opts.projectId || '';
      this.buildId = opts.buildId;
    } else {
      this.projectId = 'MockProduct';
      this.buildId = 'Build #1';
    }
  }

  async stubSfConnection(): Promise<BenchmarkOrgConnection> {
    return (await BenchmarkOrgConnection.create({
      authInfo: await AuthInfo.create({ username: this.orgMockData.username }),
    })) as BenchmarkOrgConnection;
  }

  stubSfOrg(
    connection?: BenchmarkOrgConnection
  ): SinonStubbedInstance<BenchmarkOrg> {
    const org = this.sandbox.createStubInstance(BenchmarkOrg);
    org.connect.resolves();
    org.getUnmanagedNamespaces.returns([]);
    org.getNamespaceRegExp.returns([]);

    if (connection) {
      this.sandbox.stub(org, 'connection').value(connection);
    }

    this.org = org;
    return org;
  }

  stubPg(
    andLegacy: boolean = false,
    pgMapper?: PostgresCommonDataMapper
  ): SinonStubbedInstance<PostgresDataSource> {
    const pg = this.sandbox.createStubInstance(LegacyDataSource); // temp
    pg.connect.resolves();
    this.sandbox.stub(pg, 'isConnected').value(pgMapper != null);
    this.sandbox.stub(pg, 'commonMapper').value(pgMapper);

    this.pg = pg;
    if (andLegacy) {
      this.pgLegacy = pg;
    }
    return pg;
  }
}
