/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { expect } from 'chai';
import { stub, restore } from 'sinon';
import * as envVarsHelper from '../../../src/services/salesforce/env';
import {
  getSalesforceAuthInfoFromEnvVars,
  connectToSalesforceOrg,
  SalesforceConnection,
} from '../../../src/services/salesforce/connection';
import { AuthInfo, Org } from '@salesforce/core';
import jsforce from '@jsforce/jsforce-node';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('salesforce connection module', () => {
  afterEach(() => {
    restore();
  });

  describe('getSalesforceAuthInfoFromEnvVars', () => {
    it('Retrieve no-sfdx auth info', () => {
      stub(envVarsHelper, 'getSfdxUsername').returns('');
      stub(envVarsHelper, 'getSalesforceUsername').returns('username');
      stub(envVarsHelper, 'getSalesforcePassword').returns('password');
      stub(envVarsHelper, 'getSalesforceToken').returns('token');
      stub(envVarsHelper, 'getSalesforceUrlLogin').returns('loginURL');

      const authInfo = getSalesforceAuthInfoFromEnvVars();
      expect(authInfo.isSFDX).to.be.undefined;
      expect(authInfo.username).to.be.eq('username');
      expect(authInfo.password).to.be.eq('passwordtoken');
      expect(authInfo.loginUrl).to.be.eq('loginURL');
    });

    it('Retrieve sfdx auth info', () => {
      stub(envVarsHelper, 'getSfdxUsername').returns('sfdxUsername');

      const authInfo = getSalesforceAuthInfoFromEnvVars();
      expect(authInfo.isSFDX).to.be.true;
      expect(authInfo.username).to.be.eq('sfdxUsername');
    });
  });

  describe('connectToSalesforceOrg', () => {
    it('connect to non-scratch org', async () => {
      const login = stub().resolves();
      const jsforceStub = stub(jsforce, 'Connection');

      const connectionConstructor = jsforceStub.returns({
        accessToken: 'accessToken',
        instanceUrl: 'randomUrl',
        login,
      });
      const authInfoCreate = stub(AuthInfo, 'create').resolves({} as AuthInfo);
      const sfdxCoreConnectionCreate = stub(
        SalesforceConnection,
        'create'
      ).resolves({
        instanceUrl: undefined,
      } as unknown as SalesforceConnection);

      const connection = await connectToSalesforceOrg({
        username: 'username',
        password: 'passwordtoken',
        loginUrl: 'loginUrl',
      });

      expect(connectionConstructor).to.have.been.calledOnceWith({
        loginUrl: 'loginUrl',
      });
      expect(login.args[0]).to.be.have.members(['username', 'passwordtoken']);
      expect(authInfoCreate).to.have.been.calledOnceWith({
        username: 'accessToken',
      });
      expect(sfdxCoreConnectionCreate).to.have.been.calledOnce;
      expect(connection.instanceUrl).to.be.eq('randomUrl');
    });

    it('connect to scratch org', async () => {
      const refreshAuthStub = stub();
      const orgCreate: any = stub(Org, 'create').resolves({
        refreshAuth: refreshAuthStub,
        getConnection: stub().resolves({
          instanceUrl: 'sfdxRandomUrl',
        }),
      } as unknown as Org);

      const connection = await connectToSalesforceOrg({
        username: 'username',
        isSFDX: true,
      });

      expect(refreshAuthStub).to.have.been.called;
      expect(orgCreate).to.have.been.calledWith({
        aliasOrUsername: 'username',
      });
      expect(connection.instanceUrl).to.be.eq('sfdxRandomUrl');
    });

    it('connect to scratch org but fails', async () => {
      stub(Org, 'create').resolves({
        refreshAuth: stub(),
        getConnection: stub().rejects('fake error'),
      } as unknown as Org);

      try {
        await connectToSalesforceOrg({ username: 'username', isSFDX: true });
        expect.fail();
      } catch (e) {
        expect(e).to.be.instanceof(Error);
        expect((e as Error).message).to.contains('fake error');
      }
    });
  });
});
