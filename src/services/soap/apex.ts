/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { Connection } from '@salesforce/core';
import { postSoapRequest } from './request';

export enum DebugLogCategory {
  Db = 'Db',
  Workflow = 'Workflow',
  Validation = 'Validation',
  Callout = 'Callout',
  Apex_code = 'Apex_code',
  Apex_profiling = 'Apex_profiling',
  Visualforce = 'Visualforce',
  System = 'System',
  Wave = 'Wave',
  Nba = 'Nba',
  All = 'All',
}

export enum DebugLogCategoryLevel {
  None = 'None',
  Finest = 'Finest',
  Finer = 'Finer',
  Fine = 'Fine',
  Debug = 'Debug',
  Info = 'Info',
  Warn = 'Warn',
  Error = 'Error',
}

export interface DebugLogInfo {
  category: DebugLogCategory;
  level: DebugLogCategoryLevel;
}

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

const xmlCharMap: { [index: string]: string } = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
};

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

function apexDebugHeader(debugTraces?: DebugLogInfo[]): string {
  if (debugTraces && debugTraces.length > 0) {
    const categories = debugTraces.reduce(
      (acc, curr) => acc + apexLogInfo(curr),
      ''
    );
    return `<DebuggingHeader>${categories}</DebuggingHeader>`;
  } else {
    return '';
  }
}

function apexLogInfo(info: DebugLogInfo): string {
  const category = `<category>${info.category}</category>`;
  const level = `<level>${info.level}</level>`;
  return `<categories>${category}${level}</categories>`;
}

function apexSoapRequest(header: string, body: string): string {
  return `<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns="http://soap.sforce.com/2006/08/apex">
  <soapenv:Header>${header}</soapenv:Header>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(data: string): string {
  return data.replace(/[<>&'"]/g, char => {
    return xmlCharMap[char];
  });
}
