/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { Connection } from "@salesforce/core";
import { escapeXml } from "../../parser/xml.js";
import { apexDebugHeader, type DebugLogInfo } from "./debug.js";
import { postSoapRequest } from "./request.js";

export interface ExecuteAnonymousResponse {
  column: number;
  compiled: boolean;
  compileProblem: string;
  exceptionMessage: string;
  exceptionStackTrace: string;
  line: number;
  success: boolean;
  debugLog?: string;
}

export interface ExecuteAnonymousSoapResponse {
  "soapenv:Envelope": {
    $: object;
    "soapenv:Header"?: { DebuggingInfo?: { debugLog: string } };
    "soapenv:Body": {
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
export async function executeAnonymousSoap(
  connection: Connection,
  apexCode: string,
  debugTraces?: DebugLogInfo[]
): Promise<ExecuteAnonymousResponse> {
  const soapResponse = await postSoapRequest<ExecuteAnonymousSoapResponse>(
    connection,
    "executeAnonymous",
    (accessToken: string) =>
      formatExecuteAnonymousRequest(accessToken, apexCode, debugTraces)
  );

  return formatExecuteAnonymousResponse(soapResponse);
}

function formatExecuteAnonymousResponse(
  soapResponse: ExecuteAnonymousSoapResponse
): ExecuteAnonymousResponse {
  const result =
    soapResponse["soapenv:Envelope"]["soapenv:Body"].executeAnonymousResponse
      .result;
  const {
    line,
    column,
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
    line: Number(line),
    column: Number(column),
    compiled: compiled === "true",
    success: success === "true",
    compileProblem: typeof compileProblem === "object" ? "" : compileProblem,
    exceptionMessage:
      typeof exceptionMessage === "object" ? "" : exceptionMessage,
    exceptionStackTrace:
      typeof exceptionStackTrace === "object" ? "" : exceptionStackTrace,
    debugLog:
      soapResponse["soapenv:Envelope"]["soapenv:Header"]?.DebuggingInfo
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
