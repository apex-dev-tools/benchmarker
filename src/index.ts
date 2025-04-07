/**
 *
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 *
 * @module @apexdevtools/benchmarker
 */

import { ApexBenchmarkService } from './service/apex';

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
} from './testTemplates/transactionTestTemplate';
export {
  createApexExecutionTestStepFlow,
  createApexExecutionTestStepFlowFromApex,
} from './testTemplates/testStepFlowHelper';
export { saveResults } from './testTemplates/saveResult';
export type { SalesforceConnection } from './services/salesforce/connection';
export { TokenReplacement } from './services/tokenReplacement';
