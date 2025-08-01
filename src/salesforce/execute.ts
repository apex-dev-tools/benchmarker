/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { Connection } from '@salesforce/core';
import {
  ExecuteAnonymousResponse,
  executeAnonymousSoap,
} from './soap/executeAnonymous.js';
import { DebugLogInfo } from './soap/debug.js';
import { NamedSchema, parseType } from '../parser/json.js';

export interface ExecuteAnonymousOptions {
  /**
   * Set debug logging behaviour.
   */
  debug?: DebugLogInfo[];
}

export const defaultDataPattern = /-_(.*)_-/;

export class ExecuteAnonymousError extends Error {
  constructor(message: string, stack?: string) {
    super(message);
    this.stack = stack;
  }
}

export class ExecuteAnonymousCompileError extends ExecuteAnonymousError {}

export async function executeAnonymous(
  connection: Connection,
  apexCode: string,
  options?: ExecuteAnonymousOptions
): Promise<ExecuteAnonymousResponse> {
  return executeAnonymousSoap(connection, apexCode, options?.debug);
}

export function extractAssertionData<T>(
  response: ExecuteAnonymousResponse,
  schema: NamedSchema<T>,
  pattern: RegExp = defaultDataPattern
): T {
  const error = assertAnonymousError(response);

  if (!error) {
    throw new Error('Apex did not assert false with data.');
  } else if (!response.compiled) {
    throw error;
  }

  const resMatch = error.message.match(pattern);
  const text = resMatch && resMatch[1];

  if (!text) {
    throw error;
  }

  return parseType(text, schema);
}

export function assertAnonymousError(
  execResponse: ExecuteAnonymousResponse
): ExecuteAnonymousError | null {
  // https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_calls_executeanonymous_result.htm
  // if compiled = false : compileProblem / line / column
  // if success = false : exceptionMessage / exceptionStackTrace (optionally line / column, also included in stacktrace)
  if (!execResponse.compiled) {
    const { line, column, compileProblem } = execResponse;

    return new ExecuteAnonymousCompileError(
      `Compile Error (line ${line}, col ${column}): ${compileProblem}`
    );
  } else if (!execResponse.success) {
    // This may be data capture, do not edit content
    // e.g. message: '... -_json_- '
    return new ExecuteAnonymousError(
      execResponse.exceptionMessage,
      execResponse.exceptionStackTrace
    );
  }

  return null;
}
