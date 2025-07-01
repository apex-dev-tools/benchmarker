/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  Connection,
  AuthInfo,
  ConfigAggregator,
  StateAggregator,
} from '@salesforce/core';
import jsforce, { HttpRequest } from '@jsforce/jsforce-node';

export interface OrgAuthInfo {
  username: string;
  password?: string; // password&token
  loginUrl?: string;
  version?: string;
}

/**
 * Handles connections and requests to Salesforce org
 */
export class BenchmarkOrgConnection extends Connection {
  async replaceClasses(sources: Map<string, string>) {
    const nameList = Array.from(sources.keys())
      .map(name => `'${name}'`)
      .join(', ');
    const existingClasses = await this.tooling.query(
      `Select Id From ApexClass where Name in (${nameList})`
    );
    const ids = existingClasses.records.map(r => r.Id) as string[];
    for (const id of ids) {
      await this.tooling.sobject('ApexClass').delete(id);
    }

    for (const name of sources.keys()) {
      const body = sources.get(name);
      if (body) {
        await this.tooling.sobject('ApexClass').create({ name, body });
      }
    }
  }
}

/**
 * Connects to Salesforce org given an org credentials
 * @param authInfoWrapper wraps the credentials needed to connect to an org
 */
export async function connectToSalesforceOrg(
  authInfoWrapper: OrgAuthInfo
): Promise<BenchmarkOrgConnection> {
  const { username, password, loginUrl } = authInfoWrapper;
  let connection: BenchmarkOrgConnection;

  let version = authInfoWrapper.version;
  if (!version) {
    const configAggregator = await ConfigAggregator.create();
    const value = configAggregator.getInfo('org-api-version').value;
    version = typeof value == 'string' ? value : undefined;
  }

  try {
    if (username && !password) {
      connection = await connectWithSFDXAliasOrUsername(username, version);
    } else if (password) {
      connection = await connectWithUsernameAndPassword(
        loginUrl,
        username,
        password,
        version
      );
    } else {
      throw new Error('Password is required for non-SFDX login');
    }
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(
        `Exception happened in the Salesforce authentication process. Exception message: ${e.message}`
      );
    } else {
      throw e;
    }
  }

  return connection;
}

/*
 * Connect to an org using an sfdx alias or username. This roughly follows the process used in
 * @salesforce/core Org.init (https://github.com/forcedotcom/sfdx-core/blob/main/src/org/org.ts).
 */
async function connectWithSFDXAliasOrUsername(
  aliasOrUserName: string,
  version: string | undefined
): Promise<BenchmarkOrgConnection> {
  const stateAggregator = await StateAggregator.getInstance();
  const connection = await connect(
    await AuthInfo.create({
      username: stateAggregator.aliases.resolveUsername(aliasOrUserName),
    }),
    version
  );

  // Refresh auth after we have a connection
  const requestInfo: HttpRequest = {
    url: connection.baseUrl(),
    method: 'GET',
  };
  await connection.request(requestInfo);

  return connection;
}

/*
 * Connect to an org using username/password. This creates a JSForce Connection and then
 * borrows the accessToken for that to allow creation of a @salesforce/core Connection
 * for consistency with SFDX logins.
 */
async function connectWithUsernameAndPassword(
  loginUrl: string | undefined,
  username: string,
  password: string,
  version: string | undefined
): Promise<BenchmarkOrgConnection> {
  const jsForceConnection = new jsforce.Connection({
    loginUrl: loginUrl,
  });
  await jsForceConnection.login(username, password);

  const authInfo = await AuthInfo.create({
    username: jsForceConnection.accessToken || undefined,
  });

  const connection = await connect(authInfo, version);
  connection.instanceUrl = jsForceConnection.instanceUrl;
  return connection;
}

/*
 * Create our custom connection type, BenchmarkOrgConnection derived from the
 * @salesforce/core Connection.
 */
async function connect(
  authInfo: AuthInfo,
  version?: string
): Promise<BenchmarkOrgConnection> {
  return (await BenchmarkOrgConnection.create({
    authInfo,
    connectionOptions: {
      version,
    },
  })) as BenchmarkOrgConnection;
}
