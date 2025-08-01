/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ExecuteAnonymousSoapResponse } from '../src/salesforce/soap/executeAnonymous';
import type testSetup from '@salesforce/core/lib/testSetup';

export type ExecBody =
  ExecuteAnonymousSoapResponse['soapenv:Envelope']['soapenv:Body']['executeAnonymousResponse']['result'];
export type ExecHeader =
  ExecuteAnonymousSoapResponse['soapenv:Envelope']['soapenv:Header'];

export function execAnonDataResponse(
  data: object
): ExecuteAnonymousSoapResponse {
  return execAnonSoapResponse({
    column: '1',
    exceptionMessage: `System.AssertException: Assertion Failed: -_${JSON.stringify(data)}_-`,
    exceptionStackTrace: 'AnonymousBlock: line 50, column 1',
    line: '50',
    success: 'false',
  });
}

export function execAnonErrorResponse(
  exceptionMessage: string
): ExecuteAnonymousSoapResponse {
  return execAnonSoapResponse({
    column: '1',
    exceptionMessage,
    exceptionStackTrace: 'AnonymousBlock: line 2, column 1',
    line: '2',
    success: 'false',
  });
}

export function execAnonSoapResponse(
  body?: Partial<ExecBody>,
  header?: ExecHeader
): ExecuteAnonymousSoapResponse {
  // if args are empty - success response
  return {
    'soapenv:Envelope': {
      $: {
        'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
        xmlns: 'http://soap.sforce.com/2006/08/apex',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      },
      'soapenv:Header': header,
      'soapenv:Body': {
        executeAnonymousResponse: {
          result: {
            column: '-1',
            compileProblem: {
              $: {
                'xsi:nil': 'true',
              },
            },
            compiled: 'true',
            exceptionMessage: {
              $: {
                'xsi:nil': 'true',
              },
            },
            exceptionStackTrace: {
              $: {
                'xsi:nil': 'true',
              },
            },
            line: '-1',
            success: 'true',
            ...body, // override
          },
        },
      },
    },
  };
}

// Temp hack, the testSetup is not accessible due to package json exports
// needs moduleResolution: node16/nodenext which breaks antlr4 atm
// files are still accessible by requiring the direct path
function getModulePath(name: string) {
  // this can throw MODULE_NOT_FOUND
  const main_export = require.resolve(name);
  const suffix = `/node_modules/${name}/`;
  const idx = main_export.lastIndexOf(suffix);
  if (idx == -1) {
    throw new Error(
      `failed to parse module path from main export path ${main_export}`
    );
  }
  const end = idx + suffix.length - 1;
  return main_export.slice(0, end);
}
export const sfTestSetup: typeof testSetup = require(
  getModulePath('@salesforce/core') + '/lib/testSetup'
);
