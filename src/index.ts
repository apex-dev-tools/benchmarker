/**
 *
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 *
 * @module @apexdevtools/benchmarker
 */

import * as Connection from './services/salesforce/connection';
import * as ConstantsModule from './shared/constants';
import * as Utils from './services/salesforce/utils';
import * as FSUtils from './services/filesystem';

/**
 * Test Template to executes an Apex code from a file and retrieve the Governor Limits
 */
export {
  TransactionTestTemplate,
  TestStepDescription,
  FlowStep,
  TransactionProcess,
  AlertInfo,
  Thresholds,
} from './testTemplates/transactionTestTemplate';

/**
 * Returns an async function that executes anonymous Apex code from a file and extract the Governor Limits
 */
export {
  createApexExecutionTestStepFlow,
  createApexExecutionTestStepFlowFromApex,
} from './testTemplates/testStepFlowHelper';

/**
 * Retrieve peformance metrics from a tests execution and save them
 */
export { saveResults } from './testTemplates/saveResult';

/**
 * Define and manipulate reporters for test results
 */
export {
  addReporter,
  clearReporters,
  getReporters,
  BenchmarkReporter,
} from './services/result/output';
export { TableReporter } from './services/result/table';
export type { TestResult } from './database/entity/result';

export namespace Constants {
  export namespace DefaultValues {
    /**
     * Default numeric value, -1
     */
    export const DEFAULT_NUMERIC_VALUE = ConstantsModule.DEFAULT_NUMERIC_VALUE;
    /**
     * Default string value, ''
     */
    export const DEFAULT_STRING_VALUE = ConstantsModule.DEFAULT_STRING_VALUE;
  }
}

/**
 * @deprecated This export will be removed in a future version.
 *
 * Handles connections and credentials to Salesforce Orgs
 */
export {
  SalesforceConnection,
  SalesforceAuthInfo,
} from './services/salesforce/connection';
export namespace SFConnection {
  /**
   * @deprecated This API will be removed in a future version.
   *
   * Connects to Salesforce org given an org credentials
   */
  export const connectToSalesforceOrg = Connection.connectToSalesforceOrg;

  /**
   * @deprecated This API will be removed in a future version.
   *
   * Returns Salesforce login credentials from environment variables
   */
  export const getSalesforceAuthInfoFromEnvVars =
    Connection.getSalesforceAuthInfoFromEnvVars;
}

/**
 * Timer class that allows to measure time in the tests
 */
export { Timer } from './shared/timer';

export { TokenReplacement } from './services/tokenReplacement';

export namespace SFUtils {
  /**
   * @deprecated This API will be removed in a future version.
   *
   * Executes anonymous Apex code
   */
  export const executeAnonymous = Utils.executeAnonymous;

  /**
   * @deprecated This API will be removed in a future version.
   *
   * Executes SOQL query
   */
  export const query = Utils.query;

  /**
   * @deprecated This API will be removed in a future version.
   *
   * Extracts time elapsed during Apex code execution
   */
  export const extractMatchTimeFromExecuteAnonymousResult =
    Utils.extractMatchTimeFromExecuteAnonymousResult;

  /**
   * @deprecated This API will be removed in a future version.
   *
   * Gets URL for a SObject record
   */
  export const getSObjectRecordPageURL = Utils.getSObjectRecordPageURL;
}

export namespace FileSystemUtils {
  /**
   * @deprecated This API will be removed in a future version.
   *
   * Read the content of a file given its path
   */
  export const readFile = FSUtils.readFile;
}
