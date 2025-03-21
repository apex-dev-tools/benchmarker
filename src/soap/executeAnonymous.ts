/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { Connection } from '@salesforce/core';
import { postSoapRequest } from './request';
import { escapeXml } from '../text/xml';
import { apexDebugHeader, DebugLogInfo } from './debug';

export interface ExecuteAnonymousResponse {
  column: string;
  compiled: boolean;
  compileProblem: string;
  exceptionMessage: string;
  exceptionStackTrace: string;
  line: string;
  success: boolean;
  debugLog?: string;
}

export interface ExecuteAnonymousError {
  message: string;
  stack?: string;
}

interface ExecuteAnonymousSoapResponse {
  'soapenv:Envelope': {
    'soapenv:Header'?: { DebuggingInfo?: { debugLog: string } };
    'soapenv:Body': {
      executeAnonymousResponse: {
        result: {
          column: string;
          compiled: string;
          compileProblem: string | object;
          exceptionMessage: string | object;
          exceptionStackTrace: string | object;
          line: string;
          success: string;
        };
      };
    };
  };
}

/**
 * POST a request to `/executeAnonymous` Apex SOAP API.
 *
 * Optionally enable debug logging, which is included in the reponse.
 */
export async function executeAnonymous(
  connection: Connection,
  apexCode: string,
  debugTraces?: DebugLogInfo[]
): Promise<ExecuteAnonymousResponse> {
  const soapResponse = await postSoapRequest<ExecuteAnonymousSoapResponse>(
    connection,
    'executeAnonymous',
    (accessToken: string) =>
      formatExecuteAnonymousRequest(accessToken, apexCode, debugTraces)
  );

  return formatExecuteAnonymousResponse(soapResponse);
}

export function execResponseAsError(
  execResponse: ExecuteAnonymousResponse
): ExecuteAnonymousError | null {
  // https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_calls_executeanonymous_result.htm
  // if compiled = false : compileProblem / line / column
  // if success = false : exceptionMessage / exceptionStackTrace
  if (!execResponse.compiled) {
    const { line, column, compileProblem } = execResponse;

    return {
      message: `Compile Error (Line: ${line}, Col: ${column}): ${compileProblem}`,
    };
  } else if (!execResponse.success) {
    // This may be data capture, do not edit content
    // e.g. message: '... -_json_- '
    return {
      message: execResponse.exceptionMessage,
      stack: execResponse.exceptionStackTrace,
    };
  }

  return null;
}

function formatExecuteAnonymousResponse(
  soapResponse: ExecuteAnonymousSoapResponse
): ExecuteAnonymousResponse {
  const result =
    soapResponse['soapenv:Envelope']['soapenv:Body'].executeAnonymousResponse
      .result;
  const {
    compiled,
    success,
    compileProblem,
    exceptionMessage,
    exceptionStackTrace,
  } = result;

  // line/col will be '-1' in success
  // error strings will be $nil objects if not set
  return {
    ...result,
    compiled: compiled === 'true',
    success: success === 'true',
    compileProblem: typeof compileProblem === 'object' ? '' : compileProblem,
    exceptionMessage:
      typeof exceptionMessage === 'object' ? '' : exceptionMessage,
    exceptionStackTrace:
      typeof exceptionStackTrace === 'object' ? '' : exceptionStackTrace,
    debugLog:
      soapResponse['soapenv:Envelope']['soapenv:Header']?.DebuggingInfo
        ?.debugLog,
  };
}

function formatExecuteAnonymousRequest(
  accessToken: string,
  code: string,
  debugTraces?: DebugLogInfo[]
): string {
  return apexSoapRequest(
    `<SessionHeader><sessionId>${accessToken}</sessionId></SessionHeader>
${apexDebugHeader(debugTraces)}`,
    `<executeAnonymous><String>${escapeXml(code)}</String></executeAnonymous>`
  );
}

function apexSoapRequest(header: string, body: string): string {
  return `<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns="http://soap.sforce.com/2006/08/apex">
  <soapenv:Header>${header}</soapenv:Header>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`;
}
