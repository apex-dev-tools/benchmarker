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
export {
  TransactionTestTemplate,
  TestStepDescription,
  FlowStep,
  TransactionProcess,
  AlertInfo,
  Thresholds,
  TokenReplacement,
} from './testTemplates/transactionTestTemplate.js';
export {
  createApexExecutionTestStepFlow,
  createApexExecutionTestStepFlowFromApex,
} from './testTemplates/testStepFlowHelper.js';
export { saveResults } from './testTemplates/saveResult.js';
export type { BenchmarkOrgConnection as SalesforceConnection } from './salesforce/org/connection.js';
