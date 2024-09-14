/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import {
  Connection,
  AuthInfo,
  ConfigAggregator,
  StateAggregator,
} from '@salesforce/core';
import jsforce, {
  ConnectionConfig,
  HttpRequest,
  Schema,
} from '@jsforce/jsforce-node';
import {
  getSfdxUsername,
  getSalesforceUsername,
  getSalesforcePassword,
  getSalesforceToken,
  getSalesforceUrlLogin,
} from './env';
import { retry } from './utils';

/**
 * Handles connections and requests to Salesforce org
 */
export class SalesforceConnection extends Connection {
  public constructor(options: Connection.Options<Schema>) {
    super(options);
  }

  async replaceClasses(sources: Map<string, string>) {
    const nameList = Array.from(sources.keys())
      .map(name => `'${name}'`)
      .join(', ');
    const existingClasses = await retry(
      async () =>
        await this.tooling.query(
          `Select Id From ApexClass where Name in (${nameList})`
        )
    );
    const ids = existingClasses.records.map(r => r.Id) as string[];
    for (const id of ids) {
      await retry(
        async () => await this.tooling.sobject('ApexClass').delete(id)
      );
    }

    for (const name of sources.keys()) {
      const body = sources.get(name);
      if (body) {
        await retry(
          async () =>
            await this.tooling.sobject('ApexClass').create({ name, body })
        );
      }
    }
  }
}

/**
 * Wraps credentials required to connect to Salesforce org
 */
export interface SalesforceAuthInfo {
  username: string;
  password?: string; // password&token
  loginUrl?: string;
  isSFDX?: boolean;
  version?: string;
}

/**
 * Connects to Salesforce org given an org credentials
 * @param authInfoWrapper wraps the credentials needed to connect to an org
 * @example
 * ```typescript
 * const connectionSFDXorg: SalesforceConnection = await connectToSalesforceOrg({ username: getSfdxUsername(), isSFDX: true });
 * const connectionNonSFDXorg: SalesforceConnection =  await connectToSalesforceOrg({username: getSalesforceUsername(), password: getSalesforcePassword() + getSalesforceToken(), loginUrl: getSalesforceUrlLogin()});
 * //Using getSalesforceAuthInfoFromEnvVars() to retrieve the needed credentials
 * const connectionWithWrapper = await connectToSalesforceOrg(getSalesforceAuthInfoFromEnvVars());
 * ```
 */
export async function connectToSalesforceOrg(
  authInfoWrapper: SalesforceAuthInfo
): Promise<SalesforceConnection> {
  let connection: SalesforceConnection;

  let version = authInfoWrapper.version;
  if (!version) {
    const configAggregator = await ConfigAggregator.create();
    const value = configAggregator.getInfo('org-api-version').value;
    version = typeof value == 'string' ? value : undefined;
  }

  try {
    if (authInfoWrapper.isSFDX) {
      connection = await connectWithSFDXAliasOrUsername(
        authInfoWrapper.username,
        version
      );
    } else if (authInfoWrapper.password) {
      connection = await connectWithUsernameAndPassword(
        authInfoWrapper.loginUrl,
        authInfoWrapper.username,
        authInfoWrapper.password,
        authInfoWrapper.version
      );
    } else {
      throw new Error('Password is required for non-SFDX login');
    }
  } catch (e) {
    throw new Error(
      `Exception happened in the Salesforce authentication process. Exception message: ${e}`
    );
  }

  return connection;
}
/**
 * Returns Salesforce login credentials from environment variables
 */
export function getSalesforceAuthInfoFromEnvVars(): SalesforceAuthInfo {
  return getSfdxUsername()
    ? { username: getSfdxUsername(), isSFDX: true }
    : {
        username: getSalesforceUsername(),
        password: getSalesforcePassword() + getSalesforceToken(),
        loginUrl: getSalesforceUrlLogin(),
      };
}

/*
 * Connect to an org using an sfdx alias or username. This roughly follows the process used in
 * @salesforce/core Org.init (https://github.com/forcedotcom/sfdx-core/blob/main/src/org/org.ts).
 */
async function connectWithSFDXAliasOrUsername(
  aliasOrUserName: string,
  version: string | undefined
): Promise<SalesforceConnection> {
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
): Promise<SalesforceConnection> {
  const jsForceConnection = new jsforce.Connection({
    loginUrl: loginUrl,
  });
  await jsForceConnection.login(username, password);

  const authInfo = await AuthInfo.create({
    username: jsForceConnection.accessToken || undefined,
  });

  const connection: SalesforceConnection = await connect(authInfo, version);
  connection.instanceUrl = jsForceConnection.instanceUrl;
  return connection;
}

/*
 * Create our custom connection type, SalesforceConnection derived from the
 * @salesforce/core Connection.
 */
async function connect(
  authInfo: AuthInfo,
  version: string | undefined
): Promise<SalesforceConnection> {
  const connectionOptions: ConnectionConfig<Schema> = {
    version,
    callOptions: {
      client: `sfdx toolbelt:${process.env.SFDX_SET_CLIENT_IDS ?? ''}`,
    },
    ...authInfo.getConnectionOptions(),
  } as ConnectionConfig<Schema>;

  const conn = new SalesforceConnection({ authInfo, connectionOptions });
  await conn.init();
  return conn;
}
