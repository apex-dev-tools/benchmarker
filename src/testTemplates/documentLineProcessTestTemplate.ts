/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Timer } from '../shared/timer';
import {
  DEFAULT_NUMERIC_VALUE,
  DOCUMENT_LINE_PROCESS,
} from '../shared/constants';
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

interface DocumentLinesProcessResults {
  timer: Timer;
  lines: number;
}
/**
 * DocumentLineProcessTestTemplate interface to handle the connection to the org
 */
export interface DocumentLinesProcessParams {
  connection: SalesforceConnection;
}

/**
 * Test Template to create and performs actions over objects with one headers and multiple lines
 */
export class DocumentLineProcessTestTemplate {
  /**
   * Initial number of lines to be created
   */
  public linesInitial: number;

  /**
   * Increase in the number of lines to be created
   */
  public linesPerIteration: number;

  /**
   * Maximum value of lines to be created
   */
  public linesMaximum?: number;

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
   * Set an initial metadata configuration if the test requires it
   * @param connection object to handle the connection to a Salesforce Org
   */
  public initialData: (connection: SalesforceConnection) => Promise<void>;

  /**
   * Creates the data needed in the test
   * @param nldocumentLinesines number of lines to be created
   * @param connection object to handle the connection to a Salesforce Org
   */
  public dataCreation: (
    documentLines: number,
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
  public performFlow: (param: DocumentLinesProcessParams) => Promise<Timer>;
}
export namespace DocumentLineProcess {
  /**
   * Sets the configuration for the Test Template
   * @param product Product name
   * @param linesInitial initial number of lines to be created
   * @param linesPerIteration increase in the number of lines to be created
   * @param linesMaximum maximum value of lines to be created
   * @param action describes what kind of action the test is going to perfrom
   * @param testType defines the use case the test is going to cover, by default Document Line Process
   */
  export const build = async (
    product: string,
    linesInitial: number,
    linesPerIteration: number,
    linesMaximum: number,
    action: string,
    testType: string = DOCUMENT_LINE_PROCESS
  ): Promise<DocumentLineProcessTestTemplate> => {
    const dlpTestTemplate = new DocumentLineProcessTestTemplate();
    dlpTestTemplate.product = product;
    dlpTestTemplate.linesInitial = linesInitial;
    dlpTestTemplate.linesPerIteration = linesPerIteration;
    dlpTestTemplate.linesMaximum = linesMaximum;
    dlpTestTemplate.action = action;
    dlpTestTemplate.testType = testType;

    const connectionData = await connectToSalesforceOrg(
      getSalesforceAuthInfoFromEnvVars()
    );
    dlpTestTemplate.connection = connectionData;

    return dlpTestTemplate;
  };

  /**
   * Creates the data needed for the test, performs actions with the data creted, clean the data created for the tests and retrieve the performance results
   * @param dlpTestTemplate object with the information required to execute a test
   */
  export const performTestFlow = async (
    dlpTestTemplate: DocumentLineProcessTestTemplate
  ) => {
    try {
      if (dlpTestTemplate.initialData != null)
        await dlpTestTemplate.initialData(dlpTestTemplate.connection);
      const results = await gatherResults(dlpTestTemplate);
      await saveResults(dlpTestTemplate, results);
    } catch (e) {
      console.log(`Error occured: ${JSON.stringify(e)}`);
    }

    try {
      await dlpTestTemplate.dataDeletion(dlpTestTemplate.connection);
    } catch (e) {
      console.log(`Error occurred during data deletion: ${JSON.stringify(e)}`);
    }
  };
}

const gatherResults = async (
  dlpTestTemplate: DocumentLineProcessTestTemplate,
  resultsAccumulator: DocumentLinesProcessResults[] = [],
  iteration: number = 1,
  lines: number = dlpTestTemplate.linesInitial
) => {
  try {
    await dlpTestTemplate.dataCreation(lines, dlpTestTemplate.connection);
    const iterationTimer = await dlpTestTemplate.performFlow({
      connection: dlpTestTemplate.connection,
    });

    resultsAccumulator = addResult(resultsAccumulator, {
      timer: iterationTimer,
      lines,
    });

    const newLines = getLinesForIteration(dlpTestTemplate, iteration++);

    if (newLines > 0 && iterationTimer.getTime() > 0)
      resultsAccumulator = await gatherResults(
        dlpTestTemplate,
        cloneDeep(resultsAccumulator),
        iteration++,
        newLines
      );
  } catch (e) {
    const errorTimer: Timer = onError(dlpTestTemplate, e);
    resultsAccumulator = addResult(resultsAccumulator, {
      timer: errorTimer,
      lines,
    });
  }

  return resultsAccumulator;
};

const getLinesForIteration = (
  dlpTestTemplate: DocumentLineProcessTestTemplate,
  iteration: number
) => {
  const estimatedLines =
    dlpTestTemplate.linesInitial +
    dlpTestTemplate.linesPerIteration * iteration;
  if (
    dlpTestTemplate.linesMaximum &&
    dlpTestTemplate.linesMaximum > DEFAULT_NUMERIC_VALUE &&
    estimatedLines > dlpTestTemplate.linesMaximum
  )
    return -1;

  return estimatedLines;
};

const addResult = (
  processResults: DocumentLinesProcessResults[],
  result: DocumentLinesProcessResults
) => {
  const newProcessResults: DocumentLinesProcessResults[] =
    cloneDeep(processResults);
  newProcessResults.push(result);

  return newProcessResults;
};

const onError = (
  dlpTestTemplate: DocumentLineProcessTestTemplate,
  e: TestPerformanceErrorI
) => {
  return Timer.createFromException(`${dlpTestTemplate.action}: error`, e);
};

const saveResults = async (
  dlpTestTemplate: DocumentLineProcessTestTemplate,
  results: DocumentLinesProcessResults[]
) => {
  console.log(`Saving results ${dlpTestTemplate.action}`);
  const testResults: TestResultOutput[] = results.map(
    (result: DocumentLinesProcessResults) => {
      const testResult: TestResultOutput = {
        timer: result.timer,
        action: dlpTestTemplate.action,
        flowName: '',
        error: result.timer.error,
        product: dlpTestTemplate.product,
        incognitoBrowser: false,
        lighthouseSpeedIndex: undefined,
        lighthouseTimeToInteractive: undefined,
        lines: result.lines,
        testType: dlpTestTemplate.testType,
      };

      return testResult;
    }
  );

  const orgContext = await getOrgContext(dlpTestTemplate.connection);

  await reportResults(testResults, orgContext);
};
