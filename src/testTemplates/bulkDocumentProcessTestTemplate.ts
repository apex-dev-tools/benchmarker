/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Timer } from '../shared/timer';
import { DOCUMENT_PROCESS } from '../shared/constants';
import { TestPerformanceErrorI } from '../shared/uiHelper';
import { cloneDeep } from 'lodash';
import {
  SalesforceConnection,
  connectToSalesforceOrg,
  getSalesforceAuthInfoFromEnvVars,
} from '../services/salesforce/connection';
import { TestResultOutput } from '../services/result/output';
import { getOrgContext } from '../services/org';
import { reportResults } from '../services/result';

interface BulkDocumentProcessResult {
  timer: Timer;
  ndocuments: number;
  nlines: number;
}

/**
 * BulkDocumentProcessTestTemplate interface to handle the connection to the org
 */
export interface BulkDocumentProcessParams {
  connection: SalesforceConnection;
}

/**
 * Test Template to create and performs actions over objects with multiple headers and lines
 */
export class BulkDocumentProcessTestTemplate {
  /**
   * Initial number of documents to be created
   */
  public nDocumentsInitial: number;

  /**
   * Increase in the number of documents to be created
   */
  public nDocumentsPerIteration: number;

  /**
   * Maximum value of document to be created (if reached)
   */
  public nDocumentsMaximum?: number;

  /**
   * Initial number of lines to be created
   */
  public nLinesInitial: number;

  /**
   * Increase in the number of lines to be created
   */
  public nLinesIteration: number;

  /**
   * Maximum value of lines to be created
   */
  public nLinesMaximum: number;

  /**
   * Describes what kind of action the test is going to perfrom
   */
  public action: string;

  /**
   * Product name
   */
  public product: string;

  /**
   * Object to handle the connection to a Salesforce Org
   */
  public connection: SalesforceConnection;

  /**
   * Defines the use case the test is going to cover. For example Form Load, Document Line Process, Document Process
   */
  public testType: string;

  /**
   * Creates the data needed in the test
   * @param ndocuments number of documents to be created
   * @param nlines number of lines to be created
   * @param connection object to handle the connection to a Salesforce Org
   */
  public dataCreation: (
    ndocuments: number,
    nlines: number,
    connection: SalesforceConnection
  ) => Promise<void>;

  /**
   * Deletes the data created in the test
   * @param connection object to handle the connection to a Salesforce Org
   */
  public dataDeletion: (connection: SalesforceConnection) => Promise<any>;

  /**
   * Performs operations with the data created in the test
   * @param param object to handle the connection to a Salesforce Org
   */
  public performFlow: (param: BulkDocumentProcessParams) => Promise<Timer>;
}

export namespace BulkDocumentProcess {
  /**
   * Sets the configuration for the Test Template
   * @param product Product name
   * @param nDocumentsInitial initial number of documents to be created
   * @param nDocumentsPerIteration increase in the number of documents to be created
   * @param nDocumentsMaximum maximum value of document to be created (if reached)
   * @param nLinesInitial initial number of lines to be created
   * @param nLinesIteration increase in the number of lines to be created
   * @param nLinesMaximum maximum value of lines to be created
   * @param action describes what kind of action the test is going to perfrom
   * @param testType eefines the use case the test is going to cover, by default Document Process
   */
  export const build = async (
    product: string,
    nDocumentsInitial: number,
    nDocumentsPerIteration: number,
    nDocumentsMaximum: number,
    nLinesInitial: number,
    nLinesIteration: number,
    nLinesMaximum: number,
    action: string,
    testType: string = DOCUMENT_PROCESS
  ): Promise<BulkDocumentProcessTestTemplate> => {
    const dpTestTemplate = new BulkDocumentProcessTestTemplate();
    dpTestTemplate.product = product;
    dpTestTemplate.nDocumentsInitial = nDocumentsInitial;
    dpTestTemplate.nDocumentsPerIteration = nDocumentsPerIteration;
    dpTestTemplate.nDocumentsMaximum = nDocumentsMaximum;
    dpTestTemplate.nLinesInitial = nLinesInitial;
    dpTestTemplate.nLinesIteration = nLinesIteration;
    dpTestTemplate.nLinesMaximum = nLinesMaximum;
    dpTestTemplate.action = action;
    dpTestTemplate.testType = testType;

    const connectionData = await connectToSalesforceOrg(
      getSalesforceAuthInfoFromEnvVars()
    );
    dpTestTemplate.connection = connectionData;

    return dpTestTemplate;
  };

  /**
   * Creates the data needed for the test, performs actions with the data creted, clean the data created for the tests and retrieve the performance results
   * @param dpTestTemplate object with the information required to execute a test
   */
  export const performTestFlow = async (
    dpTestTemplate: BulkDocumentProcessTestTemplate
  ) => {
    const results = await gatherResults(dpTestTemplate);
    await saveResults(dpTestTemplate, results);
  };
}

const gatherResults = async (
  dpTestTemplate: BulkDocumentProcessTestTemplate,
  resultsAccumulator: BulkDocumentProcessResult[] = [],
  ndocuments: number = dpTestTemplate.nDocumentsInitial,
  nlines: number = dpTestTemplate.nLinesInitial
) => {
  try {
    await dpTestTemplate.dataCreation(
      ndocuments,
      nlines,
      dpTestTemplate.connection
    );

    const iterationTimer = await dpTestTemplate.performFlow({
      connection: dpTestTemplate.connection,
    });

    resultsAccumulator = addResult(resultsAccumulator, {
      timer: iterationTimer,
      ndocuments,
      nlines,
    });

    const { newNumberOfDocuments, newNumberOfLines } =
      getDocumentsAndLinesNumberForIteration(
        dpTestTemplate,
        ndocuments,
        nlines
      );

    if (
      newNumberOfDocuments > 0 &&
      newNumberOfLines > 0 &&
      iterationTimer.getTime() > 0
    )
      resultsAccumulator = await gatherResults(
        dpTestTemplate,
        cloneDeep(resultsAccumulator),
        newNumberOfDocuments,
        newNumberOfLines
      );
  } catch (e) {
    const errorTimer: Timer = onError(dpTestTemplate, e);
    resultsAccumulator = addResult(resultsAccumulator, {
      timer: errorTimer,
      ndocuments,
      nlines,
    });
  } finally {
    await dpTestTemplate.dataDeletion(dpTestTemplate.connection);
  }

  return resultsAccumulator;
};

const getDocumentsAndLinesNumberForIteration = (
  dpTestTemplate: BulkDocumentProcessTestTemplate,
  currentNumberOfDocuments: number,
  currentNumberOfLines: number
) => {
  let newNumberOfDocuments: number;
  let newNumberOfLines: number;

  if (
    doNumberLinesPlusIncrementReachMaximum(dpTestTemplate, currentNumberOfLines)
  ) {
    if (
      doNumberDocumentsPlusIncrementReachMaximum(
        dpTestTemplate,
        currentNumberOfDocuments
      )
    ) {
      newNumberOfDocuments = -1;
      newNumberOfLines = -1;
    } else {
      newNumberOfLines = dpTestTemplate.nLinesInitial;
      newNumberOfDocuments =
        currentNumberOfDocuments + dpTestTemplate.nDocumentsPerIteration;
    }
  } else {
    newNumberOfLines = currentNumberOfLines + dpTestTemplate.nLinesIteration;
    newNumberOfDocuments = currentNumberOfDocuments;
  }

  return { newNumberOfDocuments, newNumberOfLines };
};

const doNumberDocumentsPlusIncrementReachMaximum = (
  dpTestTemplate: BulkDocumentProcessTestTemplate,
  currentNumberOfDocuments: number
): boolean => {
  if (
    dpTestTemplate.nDocumentsMaximum &&
    currentNumberOfDocuments + dpTestTemplate.nDocumentsPerIteration >
      dpTestTemplate.nDocumentsMaximum
  ) {
    return true;
  }
  return false;
};

const doNumberLinesPlusIncrementReachMaximum = (
  dpTestTemplate: BulkDocumentProcessTestTemplate,
  currentNumberOfLines: number
): boolean => {
  if (
    currentNumberOfLines + dpTestTemplate.nLinesIteration >
    dpTestTemplate.nLinesMaximum
  ) {
    return true;
  }
  return false;
};

const addResult = (
  processResults: BulkDocumentProcessResult[],
  result: BulkDocumentProcessResult
) => {
  const newProcessResults: BulkDocumentProcessResult[] =
    cloneDeep(processResults);
  newProcessResults.push(result);

  return newProcessResults;
};

const onError = (
  dpTestTemplate: BulkDocumentProcessTestTemplate,
  e: TestPerformanceErrorI
) => {
  return Timer.createFromException(`${dpTestTemplate.action}: error`, e);
};

const saveResults = async (
  dpTestTemplate: BulkDocumentProcessTestTemplate,
  results: BulkDocumentProcessResult[]
) => {
  console.log('Saving results...');

  const testResults: TestResultOutput[] = results.map(
    (result: BulkDocumentProcessResult) => {
      const testResult: TestResultOutput = {
        timer: result.timer,
        action: dpTestTemplate.action,
        flowName: '',
        error: result.timer.error,
        product: dpTestTemplate.product,
        incognitoBrowser: false,
        lighthouseSpeedIndex: undefined,
        lighthouseTimeToInteractive: undefined,
        lines: result.nlines,
        documents: result.ndocuments,
        testType: dpTestTemplate.testType,
      };

      return testResult;
    }
  );

  const orgContext = await getOrgContext(dpTestTemplate.connection);

  await reportResults(testResults, orgContext);
};
