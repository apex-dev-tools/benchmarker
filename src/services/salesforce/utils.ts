/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { getUnmanagePackages } from '../../shared/env';
import { SalesforceConnection } from './connection';
import { MATCH_PATTERN_ANONYMOUS_CODE_OUTPUT } from '../../shared/constants';
import { getSalesforceUrlLogin } from './env';
import axios from 'axios';
import {
  TestStepDescription,
  GovernorMetricsResult,
} from '../../testTemplates/transactionTestTemplate';
import { ExecuteAnonymousResult } from '@jsforce/jsforce-node/lib/api/tooling';
import { QueryOptions, QueryResult, Record } from '@jsforce/jsforce-node';

export const replaceNamespace = (text: string) => {
  let result = text;
  getUnmanagePackages().forEach(element => {
    result = element
      ? result.replace(new RegExp(element + '(__|.)', 'g'), '')
      : result;
  });
  return result;
};

/**
 * Executes anonymous Apex code
 * @param connection object to handle the connection to a Salesforce Org
 * @param apexCode Apex code to be executed
 * @example
 * ```typescript
 *  const apexCode = `
 * 	List<Product2> products = [Select Id, Name FROM Product2 WHERE Name='My Product';
 *  for (Integer i = 0; i < products.size(); i++)
 * 	{
 * 		products[i].Description = products[i].Name + i;
 * 	}
 * 	`;
 *  const executionResult = await executeAnonymous(connection, apexCode);
 * ```
 */
export const executeAnonymous = async (
  connection: SalesforceConnection,
  apexCode: string
) =>
  await retry(() =>
    executeAnonymousBySoap(connection, replaceNamespace(apexCode))
  );

/**
 * Extracts time elapsed during Apex code execution
 * @param connection object to handle the connection to a Salesforce Org
 * @param queryCode SOQL quey
 * @param [options] optional execution options
 */
export const query = async (
  connection: SalesforceConnection,
  queryCode: string,
  options?: QueryOptions
): Promise<QueryResult<Record>> => {
  return connection.query(replaceNamespace(queryCode), options);
};

/** @ignore */
export const sobject: any = (
  connection: SalesforceConnection,
  resource: string
) => connection.sobject(replaceNamespace(resource));

/** @ignore */
export const extractDataFromExecuteAnonymousResult = (
  anonymousExecutionResult: ExecuteAnonymousResult
) =>
  anonymousExecutionResult.exceptionMessage?.match(
    MATCH_PATTERN_ANONYMOUS_CODE_OUTPUT
  );

/** @ignore */
export const extractJSONFromExecuteAnonymousResult = function (
  anonymousExecutionResult: ExecuteAnonymousResult
): GovernorMetricsResult | undefined {
  const jsonResponse = extractDataFromExecuteAnonymousResult(
    anonymousExecutionResult
  );
  return jsonResponse ? JSON.parse(jsonResponse[1]) : undefined;
};

/**
 * Extracts time elapsed during Apex code execution
 * @param anonymousExecutionResult object that gathers the result of an anonymous Apex execution
 * @example
 * ```typescript
 * const apexCode = `
 * Datetime startTime = Datetime.now();
 * 	List<Account> accounts = [Select Id, Name FROM Account WHERE Name='My Account';
 * 	Datetime endTime = Datetime.now();
 * 	Long msElapsed = endTime.getTime() - startTime.getTime();
 * `;
 * const postResult = await executeAnonymous(connection, apexCode);
 * const msElapsed: number = extractMatchTimeFromExecuteAnonymousResult(postResult);
 * ```
 */
export const extractMatchTimeFromExecuteAnonymousResult = (
  anonymousExecutionResult: ExecuteAnonymousResult
): number => {
  const matchTime = extractDataFromExecuteAnonymousResult(
    anonymousExecutionResult
  );
  if (!matchTime) {
    throw new Error(anonymousExecutionResult.exceptionMessage || '');
  }
  const msElapsed: number = +matchTime[1];
  return msElapsed;
};

/** @ignore */
export const getElementContentFromXML = (
  xmlString: string,
  tagName: string
): string =>
  xmlString.includes(`${tagName} xsi:nil`)
    ? ''
    : xmlString
        .substring(
          xmlString.indexOf(`<${tagName}>`) + `<${tagName}>`.length,
          xmlString.indexOf(`</${tagName}>`)
        )
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

// Behaviors are extended via functions rather than object methods
/** @ignore */
export const executeAnonymousBySoap = async (
  connection: SalesforceConnection,
  anonymousApexCode: string
): Promise<ExecuteAnonymousResult> => {
  const requestOptions = {
    url: `${connection.instanceUrl}/services/Soap/T/48.0`,
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: 'AnonymousExecution',
    },
    method: 'POST',
    data: `
			<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:tooling.soap.sforce.com">
				<soapenv:Header>
					<urn:SessionHeader>
						<urn:sessionId>${connection.accessToken}</urn:sessionId>
					</urn:SessionHeader>
				</soapenv:Header>
			<soapenv:Body>
				<urn:executeAnonymous>
					<urn:String>
				${anonymousApexCode
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;')}
				</urn:String>
			</urn:executeAnonymous>
		</soapenv:Body>
		</soapenv:Envelope>
    	`,
  };

  const response = await axios(requestOptions);

  return {
    compiled: getElementContentFromXML(response.data, 'compiled') === 'true',
    success: getElementContentFromXML(response.data, 'success') === 'true',
    line: +getElementContentFromXML(response.data, 'line'),
    column: +getElementContentFromXML(response.data, 'column'),
    compileProblem: getElementContentFromXML(response.data, 'compileProblem'),
    exceptionMessage: getElementContentFromXML(
      response.data,
      'exceptionMessage'
    ),
    exceptionStackTrace: getElementContentFromXML(
      response.data,
      'exceptionStackTrace'
    ),
  };
};

/** @ignore */
export const extractGovernorMetricsFromGenericApexFlow = (
  connection: SalesforceConnection,
  testStepDescription: TestStepDescription,
  apexCode: string
): Promise<GovernorMetricsResult> => {
  // TODO: action name is not really needed here as it is only used to wrap exception. We should change this
  return new Promise(async (resolve, reject) => {
    console.log(
      `Executing ${testStepDescription.flowName} - ${testStepDescription.action} performance test...`
    );
    try {
      const anonymousExecutionResult = await executeAnonymous(
        connection,
        apexCode
      );

      const governorMetrics = extractJSONFromExecuteAnonymousResult(
        anonymousExecutionResult
      );

      if (governorMetrics) {
        resolve(governorMetrics);
      } else {
        if (anonymousExecutionResult.compileProblem) {
          console.log(
            'Compilation error: ' + anonymousExecutionResult.compileProblem
          );
          reject({
            testStepDescription,
            message: `Compilation error: ${anonymousExecutionResult.compileProblem}`,
          });
        } else if (anonymousExecutionResult.exceptionMessage) {
          console.log(anonymousExecutionResult.exceptionMessage);
          if (anonymousExecutionResult.exceptionStackTrace) {
            console.log(anonymousExecutionResult.exceptionStackTrace);
          }

          reject({
            testStepDescription,
            message: `Error in apex transaction: ${anonymousExecutionResult.exceptionMessage}`,
          });
        } else {
          reject({
            message: `Failure during ${testStepDescription.flowName} - ${testStepDescription.action} process execution. Unexpected executeAnonymous response, expecting exceptionMessage with limits: ${JSON.stringify(anonymousExecutionResult)}`,
          });
        }
      }
    } catch (e) {
      reject({
        message: `Failure during ${testStepDescription.flowName} - ${testStepDescription.action} process execution. ${e}`,
      });
    }
  });
};

/**
 * Gets URL for a SObject record
 * @param sobjectAPIname API name for SOject record
 * @param sobjectId Salesforce Id of the SObject record
 * @example
 * ```typescript
 * getSObjectRecordPageURL = ('Product2', 'a138E000000N9dr');
 * ```
 */
export const getSObjectRecordPageURL = (
  sobjectAPIname: string,
  sobjectId: string
) => {
  return `${getSalesforceUrlLogin()}/lightning/r/${sobjectAPIname}/${sobjectId}/view`;
};

/*
 * Generate frontdoor IP to access SF
 * e.g. https://na72.salesforce.com/secur/frontdoor.jsp?sid=00D1H000000OroG!AQkAQKkRDe6ViDrWaoaVq5HanvIGRX_AcZ1hfGm_bJB4g_Fseqe9GWR4d6s3VhvjrDZBFyvsnhz2M6bmplnzqktXE.jzoU5p
 */
export async function getLoginUrl(
  connectionData: SalesforceConnection
): Promise<string> {
  // FIXME - "Sending session IDs in a query string is insecure and is strongly discouraged."
  // https://help.salesforce.com/articleView?id=security_frontdoorjsp.htm
  // Suppress the Try LEX dialog by using the source URL parameter
  // https://help.salesforce.com/articleView?id=More-information-on-the-Try-Lightning-Experience-Now-prompt&language=en_US&type=1
  const retUrl = encodeURIComponent('home/home.jsp?source=lex');
  const sid = connectionData.accessToken;
  if (sid == null) {
    throw new Error(
      'Failed to generate login url - no access token/session ID'
    );
  }
  return `${
    connectionData.instanceUrl
  }/secur/frontdoor.jsp?sid=${encodeURIComponent(sid)}&retURL=${retUrl}`;
}

export async function retry<T>(
  fn: () => Promise<T>,
  retryCount = 3,
  initialWaitTimeMs = 1000,
  backoffMultiplier = 2
): Promise<T> {
  let waitTimeMs = initialWaitTimeMs;
  let lastError;
  for (let i = 0; i < retryCount; i++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      console.error(
        `Error executing function. Retrying in ${waitTimeMs}ms. ${error}`
      );
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
      waitTimeMs *= backoffMultiplier;
    }
  }
  throw new Error(
    `Failed to execute function after ${retryCount} attempts. ${lastError}`
  );
}
