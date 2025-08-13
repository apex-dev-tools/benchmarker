/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import * as dotenv from "dotenv";
import type { Alert } from "../src/database/legacy/entity/alert.js";
import { TestResult } from "../src/database/legacy/entity/result.js";
import type { LegacyDataMapper } from "../src/database/legacy/mapper.js";
import { RunContext } from "../src/state/context.js";
import { type MockEnv, MockRunContext } from "../test/mocks.js";

export function loadEnv(env?: MockEnv): void {
  // replace with either .env file or set specifics
  if (!env) {
    dotenv.config({ override: true, quiet: true });
  } else {
    MockRunContext.replaceEnv(env);
  }
}

export function restore(): void {
  MockRunContext.clearEnv();
  RunContext.reset();
}

export async function cleanDatabase(): Promise<void> {
  const connection = getMapper().dataSource;
  const entities = connection.entityMetadatas;
  const tableNames = entities
    .map(entity => `${entity.schema}.${entity.tableName}`)
    .join(", ");

  await connection.query(`TRUNCATE ${tableNames} CASCADE;`);
}

export async function createSampleAlertTestData(
  action: string,
  flowName: string,
  product: string,
  testType: string,
  count: number = 5
): Promise<void> {
  const results: TestResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push(createTestResult(action, flowName, product, testType));
  }

  await saveTestResults(results);
}

export async function saveTestResults(results: TestResult[]): Promise<void> {
  await getMapper().testResults.save(results);
}

export async function loadTestResults(): Promise<TestResult[]> {
  return getMapper().testResults.find();
}

export async function loadAlerts(
  flowName: string,
  action: string
): Promise<Alert[]> {
  return getMapper().alerts.findBy({
    flowName,
    action,
  });
}

function getMapper(): LegacyDataMapper {
  const pg = RunContext.current.pgLegacy?.mapper;
  if (!pg) {
    throw new Error("Database not connected.");
  }
  return pg;
}

function createTestResult(
  action: string,
  flowName: string,
  product: string,
  testType: string
): TestResult {
  const r: TestResult = new TestResult();
  r.flowName = flowName;
  r.action = action;
  r.product = product;
  r.testType = testType;

  r.cpuTime = Math.floor(Math.random() * 250 + 100);
  r.dmlRows = 50;
  r.dmlStatements = 50;
  r.heapSize = 75;
  r.queryRows = 0;
  r.soqlQueries = 0;
  r.queueableJobs = 0;
  r.futureCalls = 0;

  return r;
}
