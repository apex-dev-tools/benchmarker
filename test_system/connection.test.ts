/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { connectToSalesforceOrg } from '../src/salesforce/org/connection.js';
import { loadEnv, restore } from './helper.js';

describe('connection', () => {
  let username: string;

  before(() => {
    restore();
    loadEnv();
    username = process.env.BENCH_ORG_USERNAME || 'bench_testing';
  });

  it('should connect with alias', async () => {
    const connection = await connectToSalesforceOrg({
      username,
    });
    expect(connection.query('Select Id From Account')).to.not.be.undefined;
  });

  it('should not connect with bad alias', async () => {
    try {
      await connectToSalesforceOrg({
        username: 'bad',
      });
      expect.fail();
    } catch (e) {
      expect(e).to.be.instanceof(Error);
      expect((e as Error).message).to.equal(
        'Exception happened in the Salesforce authentication process. Exception message: No authorization information found for bad.'
      );
    }
  });

  it('should connect with username', async () => {
    const connection = await connectToSalesforceOrg({
      username,
    });

    const connection2 = await connectToSalesforceOrg({
      username: connection.getUsername()!,
    });

    expect(connection2.query('Select Id From Account')).to.not.be.undefined;
  });

  it('should connect at requested version', async () => {
    const connection = await connectToSalesforceOrg({
      username,
      version: '60.0',
    });

    expect(connection.getApiVersion()).to.equal('60.0');
  });

  it('should connect with username/password', async () => {
    const connection = await connectToSalesforceOrg({
      username,
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
      username,
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
        'Exception happened in the Salesforce authentication process. Exception message: INVALID_LOGIN: Invalid username, password, security token; or user locked out.'
      );
    }
  });

  it('should connect with username/password at requested version', async () => {
    const connection = await connectToSalesforceOrg({
      username,
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
