/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import * as utils from '../../src/services/salesforce/utils';
import axios, { AxiosResponse } from 'axios';
import { SalesforceConnection } from '../../src/services/salesforce/connection';
import { getOrgContext } from '../../src/services/org';
import { OrgContext } from '../../src/services/org/context';
import { ExecuteAnonymousResult } from '@jsforce/jsforce-node/lib/api/tooling';

chai.use(sinonChai);

describe('src/services/org', () => {
  let toolingQueryStub: SinonStub;
  let execAnonStub: SinonStub;
  let queryStub: SinonStub;
  let getStub: SinonStub;
  let connection: SalesforceConnection;

  beforeEach(() => {
    // bypass retries
    sinon.stub(utils, 'retry').callsArg(0);

    execAnonStub = sinon.stub(utils, 'executeAnonymous');
    queryStub = sinon.stub(utils, 'query');
    getStub = sinon.stub(axios, 'get');
    toolingQueryStub = sinon.stub();

    connection = {
      tooling: {
        query: toolingQueryStub,
      },
    } as unknown as SalesforceConnection;

    execAnonStub.onFirstCall().resolves({
      success: false,
    } as ExecuteAnonymousResult);
    queryStub.onFirstCall().resolves({
      records: [
        {
          Id: '123',
          IsSandbox: false,
          TrialExpirationDate: null,
          InstanceName: 'test instance',
          OrganizationType: 'test type',
        },
      ],
    });
    queryStub.onSecondCall().resolves({
      records: [
        {
          Domain: 'my-custom-domain',
        },
      ],
    });
    execAnonStub.onSecondCall().resolves({
      exceptionMessage: 'System.AssertException: Assertion Failed: -_false_-',
    } as ExecuteAnonymousResult);
    getStub.onFirstCall().resolves({
      data: [
        {
          label: 'TestSpring2019',
          version: '45',
        },
      ],
    } as AxiosResponse);
    toolingQueryStub.onFirstCall().resolves({
      records: [
        {
          SubscriberPackage: {
            Id: '1234',
            Name: 'Test 1',
          },
          SubscriberPackageVersion: {
            Id: '123',
            MajorVersion: 1,
            MinorVersion: 200,
            PatchVersion: 0,
            BuildNumber: 0,
            IsBeta: false,
          },
        },
      ],
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should generate a full org context', async () => {
    // Given
    // When
    const orgContext = await getOrgContext(connection);

    const expectedContext: OrgContext = {
      orgInfo: {
        apiVersion: '45',
        orgID: '123',
        releaseVersion: 'TestSpring2019',
        orgType: 'test type',
        orgInstance: 'test instance',
        isSandbox: false,
        isTrial: false,
        isMulticurrency: false,
        isLex: false,
      },
      packagesInfo: [
        {
          packageVersion: '1.200',
          packageName: 'Test 1',
          packageVersionId: '123',
          packageId: '1234',
          isBeta: false,
          betaName: -1,
        },
      ],
    };

    // Then
    expect(execAnonStub).to.be.calledTwice;
    expect(queryStub).to.be.calledTwice;
    expect(getStub).to.be.calledOnce;
    expect(toolingQueryStub).to.be.calledOnce;
    expect(orgContext).to.deep.equal(expectedContext);
  });

  it('should generate an org context for patch version', async () => {
    // Given
    toolingQueryStub.onFirstCall().resolves({
      records: [
        {
          SubscriberPackage: {
            Id: '1234',
            Name: 'Test 1',
          },
          SubscriberPackageVersion: {
            Id: '123',
            MajorVersion: 1,
            MinorVersion: 200,
            PatchVersion: 2019,
            BuildNumber: 0,
            IsBeta: false,
          },
        },
      ],
    });

    // When
    const orgContext = await getOrgContext(connection);

    const expectedContext: OrgContext = {
      orgInfo: {
        apiVersion: '45',
        orgID: '123',
        releaseVersion: 'TestSpring2019',
        orgType: 'test type',
        orgInstance: 'test instance',
        isSandbox: false,
        isTrial: false,
        isMulticurrency: false,
        isLex: false,
      },
      packagesInfo: [
        {
          packageVersion: '1.200.2019',
          packageName: 'Test 1',
          packageVersionId: '123',
          packageId: '1234',
          isBeta: false,
          betaName: -1,
        },
      ],
    };

    // Then
    expect(orgContext).to.deep.equal(expectedContext);
  });

  it('should generate an org context for beta package', async () => {
    // Given
    toolingQueryStub.onFirstCall().resolves({
      records: [
        {
          SubscriberPackage: {
            Id: '1234',
            Name: 'Test 1',
          },
          SubscriberPackageVersion: {
            Id: '123',
            MajorVersion: 1,
            MinorVersion: 200,
            PatchVersion: 2019,
            BuildNumber: 2,
            IsBeta: true,
          },
        },
      ],
    });

    // When
    const orgContext = await getOrgContext(connection);

    const expectedContext: OrgContext = {
      orgInfo: {
        apiVersion: '45',
        orgID: '123',
        releaseVersion: 'TestSpring2019',
        orgType: 'test type',
        orgInstance: 'test instance',
        isSandbox: false,
        isTrial: false,
        isMulticurrency: false,
        isLex: false,
      },
      packagesInfo: [
        {
          packageVersion: '1.200',
          packageName: 'Test 1',
          packageVersionId: '123',
          packageId: '1234',
          isBeta: true,
          betaName: 2,
        },
      ],
    };

    // Then
    expect(orgContext).to.deep.equal(expectedContext);
  });
});
