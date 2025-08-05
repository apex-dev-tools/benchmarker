/**
 *
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 *
 * @module @apexdevtools/benchmarker
 */

import { ApexBenchmarkService } from './service/apex.js';

export const apexService: ApexBenchmarkService = new ApexBenchmarkService();

/*
 * Legacy API for backward compatibility
 */
export type { BenchmarkOrgConnection as SalesforceConnection } from './salesforce/org/connection.js';
export { saveResults } from './testTemplates/saveResult.js';
export {
  createApexExecutionTestStepFlow,
  createApexExecutionTestStepFlowFromApex,
} from './testTemplates/testStepFlowHelper.js';
export {
  AlertInfo,
  Thresholds,
  TransactionProcess,
  TransactionTestTemplate,
  type FlowStep,
  type TestStepDescription,
  type TokenReplacement,
} from './testTemplates/transactionTestTemplate.js';
