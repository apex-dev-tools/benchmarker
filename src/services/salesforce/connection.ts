/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { Connection, AuthInfo, Org } from '@salesforce/core';
import jsforce from '@jsforce/jsforce-node';
import {
  getSfdxUsername,
  getSalesforceUsername,
  getSalesforcePassword,
  getSalesforceToken,
  getSalesforceUrlLogin,
} from './env';

/**
 * Handles connections and requests to Salesforce org
 */
export class SalesforceConnection extends Connection {}

/**
 * Wraps credentials required to connect to Salesforce org
 */
export interface SalesforceAuthInfo {
  username: string;
  password?: string; // password&token
  loginUrl?: string;
  isSFDX?: boolean;
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
export const connectToSalesforceOrg = async (
  authInfoWrapper: SalesforceAuthInfo
): Promise<SalesforceConnection> => {
  let connection: SalesforceConnection;

  try {
    if (authInfoWrapper.isSFDX) {
      connection = await connectToSFDXOrg(authInfoWrapper);
    } else {
      connection = await connectToStandardOrg(authInfoWrapper);
    }
  } catch (e) {
    throw new Error(
      `Exception happened in the Salesforce authentication process. Exception message: ${e}`
    );
  }

  return connection;
};
/**
 * Returns Salesforce login credentials from environment variables
 */
export const getSalesforceAuthInfoFromEnvVars = (): SalesforceAuthInfo =>
  getSfdxUsername()
    ? { username: getSfdxUsername(), isSFDX: true }
    : {
        username: getSalesforceUsername(),
        password: getSalesforcePassword() + getSalesforceToken(),
        loginUrl: getSalesforceUrlLogin(),
      };

const connectToSFDXOrg = async (
  authInfoWrapper: SalesforceAuthInfo
): Promise<SalesforceConnection> => {
  const sfOrg = await Org.create({ aliasOrUsername: authInfoWrapper.username });
  await sfOrg.refreshAuth();
  return sfOrg.getConnection();
};

const connectToStandardOrg = async (
  authInfoWrapper: SalesforceAuthInfo
): Promise<SalesforceConnection> => {
  const jsForceConnection = new jsforce.Connection({
    loginUrl: authInfoWrapper.loginUrl!,
  });
  await jsForceConnection.login(
    authInfoWrapper.username,
    authInfoWrapper.password!
  );

  const authInfo = await AuthInfo.create({
    username: jsForceConnection.accessToken || undefined,
  });

  const connection: SalesforceConnection = await SalesforceConnection.create({
    authInfo,
  });
  connection.instanceUrl = jsForceConnection.instanceUrl;

  return connection;
};
