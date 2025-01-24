/**
 *
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 *
 * @module @apexdevtools/benchmarker
 */

import * as Env from './shared/env';
import * as Data from './services/salesforce/data';
import * as Connection from './services/salesforce/connection';
import * as ConstantsModule from './shared/constants';
import * as Utils from './services/salesforce/utils';
import * as UiHelper from './shared/uiHelper';
import * as FSUtils from './services/filesystem';

/**
 * Test Template to creates multiple headers with multiple lines to call a bulkified service
 */
export {
  BulkDocumentProcessTestTemplate,
  BulkDocumentProcessParams,
  BulkDocumentProcess,
} from './testTemplates/bulkDocumentProcessTestTemplate';

/**
 * Test Template to creates a header with multiple lines to call a service
 * TestFlowStep - A function to gather information about a test step
 * TestFlowResult - Contains the results of a test step execution
 */
export {
  DocumentLineProcessExtendedMetricsTestTemplate,
  DocumentLinesProcessExtendedMetricsParams,
  DocumentLineProcessExtendedMetrics,
  TestFlowStep,
  TestFlowResult,
} from './testTemplates/documentLineProcessExtendedMetricsTestTemplate';

/**
 * Test Template to creates a header with multiple lines to call a service
 */
export {
  DocumentLineProcessTestTemplate,
  DocumentLinesProcessParams,
  DocumentLineProcess,
} from './testTemplates/documentLineProcessTestTemplate';

/**
 * Test Template to creates scenarios over batch processes
 */
export {
  BatchProcessTestTemplate,
  BatchProcessCheckerParams,
  BatchProcessStatusResult,
  BatchProcess,
  ProcessStartResult,
} from './testTemplates/batchTestTemplate';

/**
 * Test Template to performs UI testing using Chromium
 */
export { FormLoadTestTemplate } from './testTemplates/formLoadTestTemplate';

/**
 * Test Template to creates data and then performs UI actions using Chromium over the data created
 */
export {
  FormLoadWithDataLoadingTestTemplate,
  FormLoadWithDataLoading,
} from './testTemplates/formLoadWithDataLoadingTestTemplate';

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

  export namespace TestTypes {
    /**
     * Form Load test type
     */
    export const FORM_LOAD = ConstantsModule.FORM_LOAD;
    /**
     * Document Line Process test type
     */
    export const DOCUMENT_LINE_PROCESS = ConstantsModule.DOCUMENT_LINE_PROCESS;
    /**
     * Document Line Process LogGovernor Limits test type
     */
    export const DOCUMENT_LINE_PROCESS_EXTENDED_METRICS =
      ConstantsModule.DOCUMENT_LINE_PROCESS_EXTENDED_METRICS;
    /**
     * Document Process test type
     */
    export const DOCUMENT_PROCESS = ConstantsModule.DOCUMENT_PROCESS;
    /**
     * Asyncronous Process test type
     */
    export const ASYNC_PROCESS = ConstantsModule.ASYNC_PROCESS;
    /**
     * Form Load with Data Loading test type
     */
    export const FORM_LOAD_WITH_DATA_LOADING =
      ConstantsModule.FORM_LOAD_WITH_DATA_LOADING;
    /**
     * Form Load test type
     */
    export const COLD_START = ConstantsModule.COLD_START;
    /**
     * Transaction Process test type
     */
    export const PSA_SYNC_PROCESS = ConstantsModule.TRANSACTION_PROCESS;
  }

  export namespace Errors {
    /**
     * Duplicate value error
     */
    export const ERROR_DUPLICATE_VALUE = ConstantsModule.ERROR_DUPLICATE_VALUE;
    /**
     * Opening browser error
     */
    export const ERROR_OPENING_BROWSER = ConstantsModule.ERROR_OPENING_BROWSER;
  }
}

export namespace Environment {
  /**
   * Gets LINES_INITIAL environment variable
   */
  export const getLinesInitial = Env.getLinesInitial;

  /**
   * Gets LINES_MAXIMUM environment variable
   */
  export const getLinesMaximum = Env.getLinesMaximum;

  /**
   * Gets LINES_ITERATION environment variable
   */
  export const getLinesIteration = Env.getLinesIteration;

  /**
   * Gets DOCUMENTS_INITIAL environment variable
   */
  export const getDocumentsInitial = Env.getDocumentsInitial;

  /**
   * Gets DOCUMENTS_MAXIMUM environment variable
   */
  export const getDocumentsMaximum = Env.getDocumentsMaximum;

  /**
   * Gets DOCUMENTS_ITERATION environment variable
   */
  export const getDocumentsIteration = Env.getDocumentsIteration;
}

export namespace SFData {
  /**
   * Creates SObject record in an org
   */
  export const createSobjectRecord = Data.createSobjectRecord;

  /**
   * Deletes SObject records filtered by a field with its value
   */
  export const deleteRecords = Data.deleteRecords;

  /**
   * Deletes SObject records in bulk given an External Id
   */
  export const deleteGenericRecordsByExternalIDs =
    Data.deleteGenericRecordsByExternalIDs;

  /**
   * Creates SObject records in bulk from a csv file, using SF Bulk API
   */
  export const bulkInsert = Data.bulkInsert;

  /**
   * Generates unique External Ids values given a prefix and the number of items
   */
  export const generateExternalIds = Data.generateExternalIds;

  /**
   * Gets single SObject record filter by a field with its value
   */
  export const getSobjectRecord = Data.getSobjectRecord;

  /**
   * Gets multiple SObject records filter by a field with its value
   */
  export const getSobjectRecords = Data.getSobjectRecords;
}

/**
 * Handles connections and credentials to Salesforce Orgs
 */
export {
  SalesforceConnection,
  SalesforceAuthInfo,
} from './services/salesforce/connection';
export namespace SFConnection {
  /**
   * Connects to Salesforce org given an org credentials
   */
  export const connectToSalesforceOrg = Connection.connectToSalesforceOrg;

  /**
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
   * Executes anonymous Apex code
   */
  export const executeAnonymous = Utils.executeAnonymous;

  /**
   * Executes SOQL query
   */
  export const query = Utils.query;

  /**
   * Extracts time elapsed during Apex code execution
   */
  export const extractMatchTimeFromExecuteAnonymousResult =
    Utils.extractMatchTimeFromExecuteAnonymousResult;

  /**
   * Gets URL for a SObject record
   */
  export const getSObjectRecordPageURL = Utils.getSObjectRecordPageURL;
}

export namespace UIHelper {
  /**
   * Searches for element to be present in DOM
   */
  export const searchSelector = UiHelper.searchSelector;

  /**
   * Waits for a spinner to appear & dissapear
   */
  export const switchView = UiHelper.switchView;

  /**
   * Waits to Home page to appear
   */
  export const retryWaitToHomePage = UiHelper.retryWaitToHomePage;

  /**
   * Waits to page/tab/button to appear
   */
  export const retryWaitToPageTabButton = UiHelper.retryWaitToPageTabButton;

  /**
   * Adds a time delay given a number of milliseconds
   *
   */
  export const delay = UiHelper.delay;
}

export namespace FileSystemUtils {
  /**
   * Read the content of a file given its path
   */
  export const readFile = FSUtils.readFile;
}
