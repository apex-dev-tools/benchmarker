/**
 *
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 *
 * @module @apexdevtools/benchmarker
 */

export {
  AnonApexBenchmark,
  type AnonApexBenchmarkFactory,
  type AnonApexBenchmarkResult,
  type AnonApexTransaction,
} from "./benchmark/anon.js";
export {
  Benchmark,
  type BenchmarkId,
  type BenchmarkResult,
  type ErrorResult,
} from "./benchmark/base.js";
export type { LimitsBenchmarkOptions } from "./benchmark/limits.js";
export type {
  GovernorLimits,
  LimitsContext,
} from "./benchmark/limits/schemas.js";

export type { PostgresOptions } from "./database/postgres.js";

export type {
  LimitsMetric,
  LimitsMetricProviderOptions,
  LimitsThresholds,
} from "./metrics/limits.js";
export type { Degradation } from "./metrics/limits/deg.js";

export { ApexScriptError } from "./parser/apex/error.js";
export { ApexScript } from "./parser/apex/script.js";
export type { NamedSchema } from "./parser/json.js";

export type { ExecuteAnonymousOptions } from "./salesforce/execute.js";
export { BenchmarkOrg, type BenchmarkOrgOptions } from "./salesforce/org.js";
export {
  BenchmarkOrgConnection,
  connectToSalesforceOrg,
  type OrgAuthOptions,
} from "./salesforce/org/connection.js";
export type {
  OrgContext,
  OrgPackage,
  OrgRelease,
} from "./salesforce/org/context.js";
export {
  DebugLogCategory,
  DebugLogCategoryLevel,
  type DebugLogInfo,
} from "./salesforce/soap/debug.js";

export {
  ApexBenchmarkService,
  type ApexBenchmarkServiceOptions,
  type LimitsBenchmarker,
  type LimitsBenchmarkRequest,
  type LimitsBenchmarkResult,
  type LimitsBenchmarkRun,
  type LimitsMetrics,
} from "./service/apex.js";
export {
  AnonApexBenchmarker,
  type AnonApexBenchmarkerRequest,
  type AnonApexBenchmarkRun,
} from "./service/apex/runner.js";

export {
  RunContext,
  type GlobalOptions,
  type RunContextOptions,
} from "./state/context.js";
export { RunStore } from "./state/store.js";

/*
 * Partial legacy API for backward compatibility
 */

import { connectToSalesforceOrg as newConnect } from "./salesforce/org/connection.js";
import { executeAnonymous as executeAnonymousNew } from "./salesforce/execute.js";
import type { ExecuteAnonymousResult } from "@jsforce/jsforce-node/lib/api/tooling.js";
import { Connection } from "@salesforce/core";

import type { BenchmarkOrgConnection as SalesforceConnection } from "./salesforce/org/connection.js";
export type { SalesforceConnection };
export interface SalesforceAuthInfo {
  username: string;
  password?: string;
  loginUrl?: string;
  isSFDX?: boolean;
  version?: string;
}

/**
 * @deprecated This namespace will be removed in a future version.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SFConnection {
  /**
   * @deprecated This API has moved to a module export.
   *
   * Use:
   * ```
   * import { connectToSalesforceOrg } from "@apexdevtools/benchmarker";
   * await connectToSalesforceOrg({...});
   * ```
   */
  export const connectToSalesforceOrg = (
    authInfoWrapper: SalesforceAuthInfo
  ): Promise<SalesforceConnection> => {
    return newConnect(authInfoWrapper);
  };
}

/**
 * @deprecated This namespace will be removed in a future version.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SFUtils {
  /**
   * @deprecated This API has moved to `ApexBenchmarkService.execute()`.
   *
   * Use:
   * ```
   * // Replaces namespaces if set by environment or apex.setup() org options
   * import { ApexBenchmarkService } from "@apexdevtools/benchmarker";
   * const apex = ApexBenchmarkService.default;
   * await apex.execute(code, options);
   *
   * // Alternatively, for raw execute with string as is
   * import { executeAnonymous } from "@apexdevtools/benchmarker/salesforce/execute";
   * await executeAnonymous(connection, code, options);
   * ```
   */
  export const executeAnonymous = (
    connection: Connection,
    apexCode: string
  ): Promise<ExecuteAnonymousResult> => {
    // TODO ts-retry-promise if not a BenchmarkOrgConnection
    return executeAnonymousNew(
      connection,
      (
        process.env.BENCH_ORG_UNMANAGED_NAMESPACES?.split(",").map(
          e => new RegExp(e + "(__|.)", "g")
        ) || []
      ).reduce<string>((text, regex) => text.replace(regex, ""), apexCode)
    );
  };
}

export { saveResults } from "./testTemplates/saveResult.js";
export {
  createApexExecutionTestStepFlow,
  createApexExecutionTestStepFlowFromApex,
} from "./testTemplates/testStepFlowHelper.js";
export {
  AlertInfo,
  Thresholds,
  TransactionProcess,
  TransactionTestTemplate,
  type FlowStep,
  type TestFlowOptions,
  type TestFlowOutput,
  type TestStepDescription,
  type TestStepResult,
  type TokenReplacement,
} from "./testTemplates/transactionTestTemplate.js";
