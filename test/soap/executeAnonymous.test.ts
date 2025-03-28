/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { AuthInfo, Connection } from '@salesforce/core';
import {
  assertAnonymousError,
  executeAnonymous,
  ExecuteAnonymousCompileError,
  ExecuteAnonymousError,
  ExecuteAnonymousResponse,
  ExecuteAnonymousSoapResponse,
} from '../../src/soap/executeAnonymous';
import { HttpRequest } from '@jsforce/jsforce-node';

type ExecBody =
  ExecuteAnonymousSoapResponse['soapenv:Envelope']['soapenv:Body']['executeAnonymousResponse']['result'];
type ExecHeader =
  ExecuteAnonymousSoapResponse['soapenv:Envelope']['soapenv:Header'];

function execAnonSoapResponse(
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

describe('soap/executeAnonymous', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('executeAnonymous()', () => {
    const $$ = new TestContext({ sinon });
    let testData: MockTestOrgData;
    let conn: Connection;

    beforeEach(async () => {
      testData = new MockTestOrgData();
      await $$.stubAuths(testData);

      conn = await Connection.create({
        authInfo: await AuthInfo.create({ username: testData.username }),
      });
    });

    it('should post a soap request with benchmark response', async () => {
      const requestStub = sinon.stub().resolves(
        execAnonSoapResponse({
          column: '1',
          exceptionMessage:
            'System.AssertException: Assertion Failed: -_{"timer":8,"soqlQueries":0,"queueableJobs":0,"queryRows":0,"heapSize":40131,"futureCalls":0,"dmlStatements":0,"dmlRows":0,"cpuTime":9}_-',
          exceptionStackTrace: 'AnonymousBlock: line 50, column 1',
          line: '50',
          success: 'false',
        })
      );
      $$.fakeConnectionRequest = requestStub;

      const response = await executeAnonymous(conn, '0 < 1;');

      expect(requestStub).to.have.been.calledOnce;
      const rq = requestStub.args[0][0] as HttpRequest;
      expect(rq).to.deep.include({
        method: 'POST',
        url: `${testData.instanceUrl}/services/Soap/s/42.0`,
        headers: {
          'content-type': 'text/xml',
          soapaction: 'executeAnonymous',
        },
      } as HttpRequest);
      expect(rq?.body).to.include(
        `<sessionId>${testData.accessToken}</sessionId>`
      );
      expect(rq?.body).to.include(
        '<executeAnonymous><String>0 &lt; 1;</String></executeAnonymous>'
      );
      expect(response).to.eql({
        column: '1',
        compiled: true,
        compileProblem: '',
        exceptionMessage:
          'System.AssertException: Assertion Failed: -_{"timer":8,"soqlQueries":0,"queueableJobs":0,"queryRows":0,"heapSize":40131,"futureCalls":0,"dmlStatements":0,"dmlRows":0,"cpuTime":9}_-',
        exceptionStackTrace: 'AnonymousBlock: line 50, column 1',
        line: '50',
        success: false,
        debugLog: undefined,
      } as ExecuteAnonymousResponse);
    });

    it('should post a soap request with compile error response', async () => {
      const requestStub = sinon.stub().resolves(
        execAnonSoapResponse({
          column: '16',
          compileProblem: "Unexpected token 'i'.",
          compiled: 'false',
          line: '35',
          success: 'false',
        })
      );
      $$.fakeConnectionRequest = requestStub;

      const response = await executeAnonymous(conn, 'GovernorLimits i');

      expect(requestStub).to.have.been.calledOnce;
      expect(response).to.eql({
        column: '16',
        compiled: false,
        compileProblem: "Unexpected token 'i'.",
        exceptionMessage: '',
        exceptionStackTrace: '',
        line: '35',
        success: false,
        debugLog: undefined,
      } as ExecuteAnonymousResponse);
    });

    it('should post a soap request with success response', async () => {
      const requestStub = sinon.stub().resolves(execAnonSoapResponse());
      $$.fakeConnectionRequest = requestStub;

      const response = await executeAnonymous(conn, '');

      expect(requestStub).to.have.been.calledOnce;
      expect(response).to.eql({
        column: '-1',
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        line: '-1',
        success: true,
        debugLog: undefined,
      } as ExecuteAnonymousResponse);
    });

    it('should post a soap request with debug log response', async () => {
      const requestStub = sinon.stub().resolves(
        execAnonSoapResponse(
          {},
          {
            DebuggingInfo: {
              debugLog:
                '50.0 SYSTEM,DEBUG\n ... 09:26:32.26 (36453345)|EXECUTION_FINISHED\n',
            },
          }
        )
      );
      $$.fakeConnectionRequest = requestStub;

      const response = await executeAnonymous(conn, '');

      expect(requestStub).to.have.been.calledOnce;
      expect(response).to.eql({
        column: '-1',
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        line: '-1',
        success: true,
        debugLog:
          '50.0 SYSTEM,DEBUG\n ... 09:26:32.26 (36453345)|EXECUTION_FINISHED\n',
      } as ExecuteAnonymousResponse);
    });

    it('should refresh auth and make a second attempt when accessToken is expired', async () => {
      // jsforce `class HttpApiError extends Error` is not exported
      const err = new Error(
        '<soapenv:Fault><faultcode>sf:INVALID_SESSION_ID</faultcode></soapenv:Fault>'
      );
      err.name = 'ERROR_HTTP_500';

      const requestStub = sinon.stub();
      requestStub.onFirstCall().rejects(err);
      requestStub.onSecondCall().resolves({}); // refreshAuth
      requestStub.resolves(execAnonSoapResponse());
      $$.fakeConnectionRequest = requestStub;

      const response = await executeAnonymous(conn, '');

      expect(requestStub).to.have.been.calledThrice;
      expect(response).to.eql({
        column: '-1',
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        line: '-1',
        success: true,
        debugLog: undefined,
      } as ExecuteAnonymousResponse);
    });
  });

  describe('assertAnonymousError()', () => {
    it('should produce error for compile issues', () => {
      const resp: ExecuteAnonymousResponse = {
        column: '16',
        compiled: false,
        compileProblem: "Unexpected token 'i'.",
        exceptionMessage: '',
        exceptionStackTrace: '',
        line: '35',
        success: false,
      };

      const err = assertAnonymousError(resp);

      expect(err).to.not.be.null;
      expect(err).to.be.instanceof(ExecuteAnonymousCompileError);
      expect(err?.message).to.include(resp.compileProblem);
    });

    it('should produce error for apex exception', () => {
      const resp: ExecuteAnonymousResponse = {
        column: '1',
        compiled: true,
        compileProblem: '',
        exceptionMessage: 'Apex Exception',
        exceptionStackTrace: 'AnonymousBlock: line 50, column 1',
        line: '50',
        success: false,
      };

      const err = assertAnonymousError(resp);

      expect(err).to.not.be.null;
      expect(err).to.be.instanceof(ExecuteAnonymousError);
      expect(err?.message).to.eql(resp.exceptionMessage);
      expect(err?.stack).to.eql(resp.exceptionStackTrace);
    });

    it('should be null for successful response', () => {
      const resp: ExecuteAnonymousResponse = {
        column: '-1',
        compiled: true,
        compileProblem: '',
        exceptionMessage: '',
        exceptionStackTrace: '',
        line: '-1',
        success: true,
      };

      const err = assertAnonymousError(resp);

      expect(err).to.be.null;
    });
  });
});
