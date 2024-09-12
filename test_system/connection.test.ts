/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { connectToSalesforceOrg } from '../src/services/salesforce/connection';

describe('Connection', function () {
  before(async function () {});

  it('should connect with alias', async () => {
    const connection = await connectToSalesforceOrg({
      isSFDX: true,
      username: 'bench_testing',
    });
    expect(connection.query('Select Id From Account')).to.not.be.undefined;
  });

  it('should not connect with bad alias', async () => {
    try {
      await connectToSalesforceOrg({
        isSFDX: true,
        username: 'bad',
      });
      expect.fail();
    } catch (e) {
      expect(e).to.be.instanceof(Error);
      expect((e as Error).message).to.equal(
        'Exception happened in the Salesforce authentication process. Exception message: NamedOrgNotFoundError: No authorization information found for bad.'
      );
    }
  });

  it('should connect with username', async () => {
    const connection = await connectToSalesforceOrg({
      isSFDX: true,
      username: 'bench_testing',
    });

    const connection2 = await connectToSalesforceOrg({
      isSFDX: true,
      username: connection.getUsername()!,
    });

    expect(connection2.query('Select Id From Account')).to.not.be.undefined;
  });

  it('should connect at requested version', async () => {
    const connection = await connectToSalesforceOrg({
      isSFDX: true,
      username: 'bench_testing',
      version: '60.0',
    });

    expect(connection.getApiVersion()).to.equal('60.0');
  });

  it('should connect with username/password', async () => {
    const connection = await connectToSalesforceOrg({
      isSFDX: true,
      username: 'bench_testing',
    });
    const userIdResults = await connection.query(
      `Select Id from User where Username='${connection.getUsername()}'`
    );
    const password = 'Test' + Math.floor(Math.random() * 1000000);
    await connection.soap.setPassword(userIdResults.records[0].Id!, password);

    const publicIp = await import('public-ip');
    const ip = await publicIp.publicIpv4();
    expect(ip).to.not.be.empty;

    await connection.metadata.update('SecuritySettings', {
      networkAccess: {
        ipRanges: [{ start: ip, end: ip }],
      },
    });

    const connection2 = await connectToSalesforceOrg({
      username: connection.getUsername()!,
      password,
      loginUrl: 'https://test.salesforce.com/',
    });

    expect(connection2.query('Select Id From Account')).to.not.be.undefined;
  });

  it('should not connect with username/password with bad password', async () => {
    const connection = await connectToSalesforceOrg({
      isSFDX: true,
      username: 'bench_testing',
    });
    const userIdResults = await connection.query(
      `Select Id from User where Username='${connection.getUsername()}'`
    );
    const password = 'Test' + Math.floor(Math.random() * 1000000);
    await connection.soap.setPassword(userIdResults.records[0].Id!, password);

    const publicIp = await import('public-ip');
    const ip = await publicIp.publicIpv4();
    expect(ip).to.not.be.empty;

    await connection.metadata.update('SecuritySettings', {
      networkAccess: {
        ipRanges: [{ start: ip, end: ip }],
      },
    });

    try {
      await connectToSalesforceOrg({
        username: connection.getUsername()!,
        password: password + 'Junk',
        loginUrl: 'https://test.salesforce.com/',
      });
    } catch (e) {
      expect(e).to.be.instanceof(Error);
      expect((e as Error).message).to.equal(
        'Exception happened in the Salesforce authentication process. Exception message: Error: INVALID_LOGIN: Invalid username, password, security token; or user locked out.'
      );
    }
  });

  it('should connect with username/password at requested version', async () => {
    const connection = await connectToSalesforceOrg({
      isSFDX: true,
      username: 'bench_testing',
    });
    const userIdResults = await connection.query(
      `Select Id from User where Username='${connection.getUsername()}'`
    );
    const password = 'Test' + Math.floor(Math.random() * 1000000);
    await connection.soap.setPassword(userIdResults.records[0].Id!, password);

    const publicIp = await import('public-ip');
    const ip = await publicIp.publicIpv4();
    expect(ip).to.not.be.empty;

    await connection.metadata.update('SecuritySettings', {
      networkAccess: {
        ipRanges: [{ start: ip, end: ip }],
      },
    });

    const connection2 = await connectToSalesforceOrg({
      username: connection.getUsername()!,
      password,
      loginUrl: 'https://test.salesforce.com/',
      version: '60.0',
    });

    expect(connection2.getApiVersion()).to.equal('60.0');
  });
});
