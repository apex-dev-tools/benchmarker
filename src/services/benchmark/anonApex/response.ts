/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { ExecuteAnonymousResponse } from '../../soap/apex';

export interface AnonApexError {
  message: string;
  stack?: string;
}

export function getErrorFromResponse(
  execResponse: ExecuteAnonymousResponse
): AnonApexError | null {
  // https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_calls_executeanonymous_result.htm
  // if compiled = false : compileProblem / line / column
  // if success = false : exceptionMessage / exceptionStackTrace
  if (execResponse.compiled && execResponse.success) {
    return null;
  }

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

  return {
    message: 'Unknown Error: Exception message and stack trace not available.',
  };
}
