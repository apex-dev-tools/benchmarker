/*
 * Copyright (c) 2022 FinancialForce.com, inc. All rights reserved.
 */

import { Timer } from '../shared/timer';
import {
  DEFAULT_NUMERIC_VALUE,
  DOCUMENT_LINE_PROCESS_EXTENDED_METRICS,
} from '../shared/constants';
import {
  SalesforceConnection,
  connectToSalesforceOrg,
  getSalesforceAuthInfoFromEnvVars,
} from '../services/salesforce/connection';
import { TestResultOutput } from '../services/result/output';
import { getOrgContext } from '../services/org';
import { reportResults } from '../services/result';

export interface GovernorMetricsResult {
  timer: number;
  cpuTime: number;
  dmlRows: number;
  dmlStatements: number;
  heapSize: number;
  queryRows: number;
  soqlQueries: number;
}

/**
 * @deprecated This API is unsupported and will be removed in a future version.
 *
 * DocumentLineProcessExtendedMetricsTestTemplate interface to handle the connection to the org
 */
export interface DocumentLinesProcessExtendedMetricsParams {
  connection: SalesforceConnection;
}

/**
 * @deprecated This API is unsupported and will be removed in a future version.
 *
 * Test Template to create and performs actions over objects with one headers and multiple lines
 */
export class DocumentLineProcessExtendedMetricsTestTemplate {
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
   * Test steps to be executed
   */
  public flowSteps: TestFlowStep[];

  /**
   * Results of the test steps executions
   */
  public flowStepsResults: TestFlowResult[];

  /**
   * Defines the use case the test is going to cover. For example Form Load, Document Line Process, Document Process
   */
  public testType: string;

  /**
   * @deprecated This API is unsupported and will be removed in a future version.
   *
   * Set an initial metadata configuration if the test requires it
   * @param connection object to handle the connection to a Salesforce Org
   */
  public initialData: (connection: SalesforceConnection) => Promise<void>;

  /**
   * @deprecated This API is unsupported and will be removed in a future version.
   *
   * Creates the data needed in the test
   * @param nldocumentLinesines number of lines to be created
   * @param connection object to handle the connection to a Salesforce Org
   */
  public dataCreation: (
    documentLines: number,
    connection: SalesforceConnection
  ) => Promise<void>;

  /**
   * @deprecated This API is unsupported and will be removed in a future version.
   *
   * Deletes the data created in the test
   * @param connection object to handle the connection to a Salesforce Org
   */
  public dataDeletion: (connection: SalesforceConnection) => Promise<any>;

  /**
   * @deprecated This API is unsupported and will be removed in a future version.
   *
   * Performs operations with the data created in the test
   * @param param object to handle the connection to a Salesforce Org
   */
  public performFlow: (
    param: DocumentLinesProcessExtendedMetricsParams
  ) => Promise<TestFlowResult>;
}

/**
 * @deprecated This API is unsupported and will be removed in a future version.
 *
 * DocumentLineProcessExtendedMetricsTestTemplate to add information about the name of the flow to be executed and the action perfromed
 */
export interface TestStepDescription {
  action: string;
  flowName: string;
}

/**
 * @deprecated This API is unsupported and will be removed in a future version.
 */
export interface TestFlowResult {
  testStepDescription: TestStepDescription;
  result: GovernorMetricsResult;
  lines?: number;
  documents?: number;
  error?: string;
}

/**
 * @deprecated This API is unsupported and will be removed in a future version.
 *
 * A function to gather information about a test step
 */
export type TestFlowStep = () => Promise<TestFlowResult>;

/**
 * @deprecated This API is unsupported and will be removed in a future version.
 */
export namespace DocumentLineProcessExtendedMetrics {
  /**
   * @deprecated This API is unsupported and will be removed in a future version.
   *
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
    testType: string = DOCUMENT_LINE_PROCESS_EXTENDED_METRICS
  ): Promise<DocumentLineProcessExtendedMetricsTestTemplate> => {
    const dlpTestTemplate =
      new DocumentLineProcessExtendedMetricsTestTemplate();
    dlpTestTemplate.product = product;
    dlpTestTemplate.linesInitial = linesInitial;
    dlpTestTemplate.linesPerIteration = linesPerIteration;
    dlpTestTemplate.linesMaximum = linesMaximum;
    dlpTestTemplate.action = action;
    dlpTestTemplate.testType = testType;
    dlpTestTemplate.flowSteps = [];
    dlpTestTemplate.flowStepsResults = [];

    const connectionData = await connectToSalesforceOrg(
      getSalesforceAuthInfoFromEnvVars()
    );
    dlpTestTemplate.connection = connectionData;

    return dlpTestTemplate;
  };

  /**
   * @deprecated This API is unsupported and will be removed in a future version.
   *
   * Creates the data needed for the test, performs actions with the data creted, clean the data created for the tests and retrieve the performance results
   * @param dlpTestTemplate object with the information required to execute a test
   */
  export const performTestFlow = async (
    dlpTestTemplate: DocumentLineProcessExtendedMetricsTestTemplate
  ) => {
    try {
      if (dlpTestTemplate.initialData != null)
        await dlpTestTemplate.initialData(dlpTestTemplate.connection);
      dlpTestTemplate.flowStepsResults = [];
      await gatherResults(dlpTestTemplate);
      await saveResults(dlpTestTemplate, dlpTestTemplate.flowStepsResults);
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
  dlpTestTemplate: DocumentLineProcessExtendedMetricsTestTemplate,
  iteration: number = 1,
  lines: number = dlpTestTemplate.linesInitial
) => {
  try {
    await dlpTestTemplate.dataCreation(lines, dlpTestTemplate.connection);
    const result: TestFlowResult = await dlpTestTemplate.performFlow({
      connection: dlpTestTemplate.connection,
    });
    result.lines =
      dlpTestTemplate.linesInitial +
      dlpTestTemplate.linesPerIteration * (iteration - 1);
    result.documents = 1;
    dlpTestTemplate.flowStepsResults.push(result);
    const newLines = getLinesForIteration(dlpTestTemplate, iteration++);

    if (newLines > 0)
      await gatherResults(dlpTestTemplate, iteration++, newLines);
  } catch (e) {
    dlpTestTemplate.flowStepsResults.push({
      testStepDescription: e.testStepDescription,
      error: e.message,
      result: {
        cpuTime: -1,
        dmlRows: -1,
        dmlStatements: -1,
        heapSize: -1,
        queryRows: -1,
        soqlQueries: -1,
        timer: -1,
      },
    });
  }
};

const getLinesForIteration = (
  dlpTestTemplate: DocumentLineProcessExtendedMetricsTestTemplate,
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

/**
 * Retrieve peformance metrics from a tests execution and save them
 * @param processTestTemplate object with the information required to execute a test
 * @param results results of the test steps executions
 * ```
 */
const saveResults = async (
  processTestTemplate: DocumentLineProcessExtendedMetricsTestTemplate,
  results: TestFlowResult[]
) => {
  const testResults = results.map((flowOutput: TestFlowResult) => {
    const action: string = flowOutput.testStepDescription.action;
    const flowName: string = flowOutput.testStepDescription.flowName;
    const result: GovernorMetricsResult = flowOutput.result;
    const testTimer = new Timer('');
    testTimer.setTime(result.timer);
    const testStep: TestResultOutput = {
      timer: testTimer,
      cpuTime: result.cpuTime,
      dmlRows: result.dmlRows,
      dmlStatements: result.dmlStatements,
      heapSize: result.heapSize,
      queryRows: result.queryRows,
      soqlQueries: result.soqlQueries,
      lines: flowOutput.lines,
      documents: flowOutput.documents,
      action,
      flowName,
      error: flowOutput.error ? flowOutput.error : '',
      product: processTestTemplate.product,
      incognitoBrowser: false,
      lighthouseSpeedIndex: undefined,
      lighthouseTimeToInteractive: undefined,
      testType: processTestTemplate.testType,
    };

    return testStep;
  });

  const orgContext = await getOrgContext(processTestTemplate.connection);

  await reportResults(testResults, orgContext);
};
