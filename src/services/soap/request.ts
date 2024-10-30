/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { Connection } from '@salesforce/core';

export async function postSoapRequest<R>(
  connection: Connection,
  action: string,
  body: (accessToken: string) => string
): Promise<R> {
  try {
    return await postRequest<R>(
      connection,
      action,
      body(connection.accessToken!)
    );
  } catch (e) {
    // request does not auto refresh (see refreshAuth doc)
    // make 1 more attempt if session expired
    if (
      e.name === 'ERROR_HTTP_500' &&
      e.message &&
      e.message.includes('INVALID_SESSION_ID')
    ) {
      await connection.refreshAuth();
      return postRequest<R>(connection, action, body(connection.accessToken!));
    } else {
      throw e;
    }
  }
}

function postRequest<R>(
  connection: Connection,
  action: string,
  body: string
): Promise<R> {
  return connection.request<R>({
    method: 'POST',
    url: `${connection.instanceUrl}/services/Soap/s/${connection.version}`,
    body,
    headers: {
      'content-type': 'text/xml',
      soapaction: action,
    },
  });
}
