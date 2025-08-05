/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import type { Connection } from '@salesforce/core';

/**
 * Make a POST request to Salesforce SOAP API at given soapaction.
 *
 * Body handler can be called again if session timed out. Use the passed
 * access token to set a new `SessionHeader`.
 */
export async function postSoapRequest<R>(
  connection: Connection,
  soapaction: string,
  body: (accessToken: string) => string
): Promise<R> {
  try {
    return await postRequest<R>(
      connection,
      soapaction,
      body(connection.accessToken!)
    );
  } catch (e) {
    // The `refreshFn` is used only on 401 by default, set by AuthInfo or jsforce login().
    // The `accessToken` flow does not provide one. Safest to always force a refresh.
    if (
      e instanceof Error &&
      e.name === 'ERROR_HTTP_500' &&
      e.message.includes('INVALID_SESSION_ID')
    ) {
      await connection.refreshAuth();
      return postRequest<R>(
        connection,
        soapaction,
        body(connection.accessToken!)
      );
    } else {
      throw e;
    }
  }
}

function postRequest<R>(
  connection: Connection,
  soapaction: string,
  body: string
): Promise<R> {
  return connection.request<R>({
    method: 'POST',
    url: `${connection.instanceUrl}/services/Soap/s/${connection.version}`,
    body,
    headers: {
      'content-type': 'text/xml',
      soapaction,
    },
  });
}
