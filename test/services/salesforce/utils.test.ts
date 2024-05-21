/*
 * Copyright (c) 2019-2020 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { stub, spy, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import * as utils from '../../../src/services/salesforce/utils';
import { Connection } from '@salesforce/core';
import * as env from '../../../src/shared/env';
import * as envSf from '../../../src/services/salesforce/env';
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import {
  extractDataFromExecuteAnonymousResult,
  extractMatchTimeFromExecuteAnonymousResult,
  extractJSONFromExecuteAnonymousResult,
  extractGovernorMetricsFromGenericApexFlow,
} from '../../../src/services/salesforce/utils';
import * as salesforceUtilsHelper from '../../../src/services/salesforce/utils';

import { SalesforceConnection } from '../../../src/services/salesforce/connection';
import { TestStepDescription } from '../../../src/testTemplates/transactionTestTemplate';
import { ExecuteAnonymousResult } from '@jsforce/jsforce-node/lib/api/tooling';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('src/services/salesforce/utils', () => {
  afterEach(() => {
    restore();
  });

  describe('query', () => {
    it('returns response', async () => {
      const connectionStub: unknown = {
        query: stub().resolves({
          records: [
            {
              IsSandbox: true,
              TrialExpirationDate: null,
              InstanceName: 'test instance',
              OrganizationType: 'test type',
              Id: 123,
            },
          ],
        }),
      };

      const response = await utils.query(
        connectionStub as Connection,
        'query soql'
      );
      expect(response.records[0].Id).to.be.eq(123);
    });
  });

  describe('replaceNamespace', () => {
    it('returns namespace replace', async () => {
      stub(env, 'getUnmanagePackages').returns(['abc', 'bcd']);

      const text = utils.replaceNamespace('abc__test bcd__test2');
      expect(text).to.be.equal('test test2');
    });

    it('returns original text', async () => {
      stub(env, 'getUnmanagePackages').returns([]);

      const text = utils.replaceNamespace('abc__test');
      expect(text).to.be.equal('abc__test');
    });
  });

  describe('getSObjectRecordPageURL', () => {
    it('returns navigation page', async () => {
      stub(envSf, 'getSalesforceUrlLogin').returns('test');
      const pageUrl = utils.getSObjectRecordPageURL('Account', 'fakeId');

      expect(pageUrl).to.be.equal('test/lightning/r/Account/fakeId/view');
    });
  });

  describe('executeAnonymousBySoap', () => {
    let mockAxios: any;

    before(() => {
      mockAxios = new AxiosMockAdapter(axios);
    });

    after(() => {
      mockAxios.restore();
    });

    it('should execute anonymous Apex code and return the result', async () => {
      const connection: unknown = {
        instanceUrl: 'test',
        accessToken: 'testAccessToken',
      };
      const response = `
			<?xml version="1.0" encoding="UTF-8"?>
			<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns="urn:tooling.soap.sforce.com" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
					<soapenv:Body>
				<executeAnonymousResponse>
					<result>
						<column>1</column>
						<compileProblem xsi:nil="true" />
						<compiled>true</compiled>
						<exceptionMessage>System.AssertException: Assertion Failed</exceptionMessage>
						<exceptionStackTrace>AnonymousBlock: line 1, column 1</exceptionStackTrace>
						<line>1</line>
						<success>false</success>
					</result>
				</executeAnonymousResponse>
					</soapenv:Body>
				</soapenv:Envelope>
			`;
      mockAxios
        .onPost(`${(connection as any).instanceUrl}/services/Soap/T/48.0`)
        .reply(200, response);

      const result = await utils.executeAnonymous(
        connection as Connection,
        'apex code'
      );
      console.log(result);
      expect(result.compiled).to.be.equal(true);
      expect(result.success).to.be.equal(false);
      expect(result.line).to.be.equal(1);
      expect(result.column).to.be.equal(1);
      expect(result.compileProblem).to.be.equal('');
      expect(result.exceptionMessage).to.be.equal(
        'System.AssertException: Assertion Failed'
      );
      expect(result.exceptionStackTrace).to.be.equal(
        'AnonymousBlock: line 1, column 1'
      );
    });
  });

  describe('sobject', () => {
    it('returns sobject type', async () => {
      const connectionStub: unknown = {
        sobject: stub().returns({
          type: 'Mock__c',
        }),
      };

      const response = await utils.sobject(
        connectionStub as Connection,
        'fake__Mock__c'
      );
      expect(response.type).to.be.equal('Mock__c');
    });
  });

  describe('extractDataFromExecuteAnonymousResult', () => {
    it('get desired data with given token', () => {
      const anonExecutionResult = {
        exceptionMessage:
          'System.AssertException: Assertion Failed: -_IMPORTANT INFO_-',
      } as ExecuteAnonymousResult;
      const info = extractDataFromExecuteAnonymousResult(anonExecutionResult);

      if (!info) {
        expect.fail();
      } else {
        expect(info[1]).to.be.eq('IMPORTANT INFO');
      }
    });
  });

  describe('extractMatchTimeFromExecuteAnonymousResult', () => {
    it('get desired data from anon execution', () => {
      const elapsedTime = extractMatchTimeFromExecuteAnonymousResult({
        exceptionMessage: 'System.AssertException: Assertion Failed: -_10_-',
      } as ExecuteAnonymousResult);

      expect(elapsedTime).to.be.eq(10);
    });

    it('anon execution result does not contain time', () => {
      try {
        extractMatchTimeFromExecuteAnonymousResult({
          exceptionMessage: 'bad reference to variable',
        } as ExecuteAnonymousResult);
      } catch (e) {
        expect(e).to.be.instanceof(Error);
        expect((e as Error).message).to.contains('bad reference to variable');
      }
    });
  });

  describe('extractJSONFromExecuteAnonymousResult', () => {
    it('get desired data from anon execution', () => {
      const json = extractJSONFromExecuteAnonymousResult({
        exceptionMessage:
          'System.AssertException: Assertion Failed: -_{"a":1, "b":2}_-',
      } as ExecuteAnonymousResult);

      expect(json).to.deep.equal({ a: 1, b: 2 });
    });
  });

  describe('extractGovernorMetricsFromGenericApexFlow', () => {
    const mockTestStepDescription: TestStepDescription = {
      action: 'MockAction',
      flowName: 'MockFlowName',
    };
    it('get desired data from apex script execution', async () => {
      stub(salesforceUtilsHelper, 'executeAnonymous').resolves({
        exceptionMessage:
          'System.AssertException: Assertion Failed: -_{"dmlRows":2, "timer":10}_-',
      } as ExecuteAnonymousResult);
      const governorLimits = await extractGovernorMetricsFromGenericApexFlow(
        {} as SalesforceConnection,
        mockTestStepDescription,
        'some apex script'
      );

      expect(governorLimits).to.deep.equal({ dmlRows: 2, timer: 10 });
    });

    it('compilation problem is raised on code execution result parsing', async () => {
      stub(salesforceUtilsHelper, 'executeAnonymous').resolves({
        compileProblem: 'some symbol can not be compiled',
      } as ExecuteAnonymousResult);
      stub(
        salesforceUtilsHelper,
        'extractJSONFromExecuteAnonymousResult'
      ).returns(undefined);
      try {
        await extractGovernorMetricsFromGenericApexFlow(
          {} as SalesforceConnection,
          mockTestStepDescription,
          'some apex script'
        );
      } catch (e) {
        expect(e).to.have.property('message');
        expect((e as { message: string }).message).to.contains(
          'some symbol can not be compiled'
        );
      }
    });

    it('execution problem is raised on code execution', async () => {
      stub(salesforceUtilsHelper, 'executeAnonymous').resolves({
        exceptionMessage: 'wrong execution',
        exceptionStackTrace: 'exception stacktrace',
      } as ExecuteAnonymousResult);
      stub(
        salesforceUtilsHelper,
        'extractDataFromExecuteAnonymousResult'
      ).returns([] as unknown as RegExpMatchArray);

      try {
        await extractGovernorMetricsFromGenericApexFlow(
          {} as SalesforceConnection,
          mockTestStepDescription,
          'some apex script'
        );
      } catch (e) {
        expect(e).to.have.property('message');
        expect((e as { message: string }).message).to.contains(
          `Failure during ${mockTestStepDescription.flowName} - ${mockTestStepDescription.action} process execution`
        );
      }
    });

    it('execution problem is raised on code execution', async () => {
      stub(salesforceUtilsHelper, 'executeAnonymous').resolves({
        exceptionMessage: 'wrong execution',
        exceptionStackTrace: 'exception stacktrace',
      } as ExecuteAnonymousResult);
      stub(
        salesforceUtilsHelper,
        'extractDataFromExecuteAnonymousResult'
      ).returns(null);

      try {
        await extractGovernorMetricsFromGenericApexFlow(
          {} as SalesforceConnection,
          mockTestStepDescription,
          'some apex script'
        );
      } catch (e) {
        expect(e).to.have.property('message');
        expect((e as { message: string }).message).to.contains(
          'wrong execution'
        );
      }
    });

    it('execution problem is raised', async () => {
      stub(salesforceUtilsHelper, 'executeAnonymous').resolves({
        exceptionMessage: 'wrong execution',
        exceptionStackTrace: 'exception stacktrace',
      } as ExecuteAnonymousResult);
      stub(
        salesforceUtilsHelper,
        'extractJSONFromExecuteAnonymousResult'
      ).throws();
      try {
        await extractGovernorMetricsFromGenericApexFlow(
          {} as SalesforceConnection,
          mockTestStepDescription,
          'some apex script'
        );
      } catch (e) {
        expect(e).to.have.property('message');
        expect((e as { message: string }).message).to.contains(
          `Failure during ${mockTestStepDescription.flowName} - ${mockTestStepDescription.action} process execution`
        );
      }
    });

    it('executing problem is raised on code execution and extracting data from anonymous result', async () => {
      stub(salesforceUtilsHelper, 'executeAnonymous').resolves({
        exceptionMessage: 'wrong execution',
      } as ExecuteAnonymousResult);
      stub(
        salesforceUtilsHelper,
        'extractJSONFromExecuteAnonymousResult'
      ).returns(null);
      try {
        await extractGovernorMetricsFromGenericApexFlow(
          {} as SalesforceConnection,
          mockTestStepDescription,
          'some apex script'
        );
      } catch (e) {
        expect(e).to.have.property('message');
        expect((e as { message: string }).message).to.contains(
          'wrong execution'
        );
      }
    });

    it('executing problem is raised on code execution', async () => {
      stub(salesforceUtilsHelper, 'executeAnonymous').resolves({
        exceptionMessage: '',
      } as ExecuteAnonymousResult);
      stub(
        salesforceUtilsHelper,
        'extractJSONFromExecuteAnonymousResult'
      ).returns(undefined);
      try {
        await extractGovernorMetricsFromGenericApexFlow(
          {} as SalesforceConnection,
          mockTestStepDescription,
          'some apex script'
        );
      } catch (e) {
        expect(e).to.have.property('message');
        expect((e as { message: string }).message).to.contains(
          `Failure during ${mockTestStepDescription.flowName} - ${mockTestStepDescription.action} process execution`
        );
      }
    });
  });

  describe('getLoginUrl', () => {
    it('should return frontdoor URL', async () => {
      // Given
      const EXPECTED_LOGIN_URL =
        'https://ff01.salesforce.com/secur/frontdoor.jsp?sid=example%20access%20token&retURL=home%2Fhome.jsp%3Fsource%3Dlex';

      // When
      const loginUrl = await utils.getLoginUrl({
        instanceUrl: EXPECTED_LOGIN_URL,
        accessToken: 'ACCESS_TOKEN',
      } as SalesforceConnection);

      // Then
      expect(loginUrl).to.contains(EXPECTED_LOGIN_URL);
    });
  });

  describe('retry', () => {
    beforeEach(() => {
      stub(global, 'setTimeout').callsArg(0);
    });

    function alwaysSucceeds(): Promise<string> {
      return Promise.resolve('Success');
    }

    function alwaysFails(): Promise<any> {
      return Promise.reject(new Error('Function always fails'));
    }

    let attempt = 1;
    function succeedsOnThird(): Promise<string> {
      return new Promise((resolve, reject) => {
        if (attempt < 3) {
          attempt++;
          reject(new Error('Function failed'));
        } else {
          resolve('Success');
        }
      });
    }

    it('should retry a failing function until it succeeds', async () => {
      const fn = spy(alwaysSucceeds);
      const result = await utils.retry(fn);
      expect(result).to.equal('Success');
      expect(fn.calledOnce).to.be.true;
    });

    it('should retry a failing function until it reaches the maximum number of retries', async () => {
      const fn = spy(alwaysFails);
      await expect(utils.retry(fn)).to.be.rejectedWith(
        'Failed to execute function after 3 attempts.'
      );
      expect(fn.callCount).to.equal(3);
    }).timeout(8000);

    it('should retry a function that fails a few times before succeeding', async () => {
      const fn = spy(succeedsOnThird);
      const result = await utils.retry(fn);
      expect(result).to.equal('Success');
      expect(fn.callCount).to.equal(3);
    }).timeout(5000);
  });
});
