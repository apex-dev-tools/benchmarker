/** @ignore */
/**
 * Copyright (c) 2024 Certinia, Inc. All rights reserved.
 */

import { Alert } from './entity/alert';
import { getConnection } from './connection';

export async function saveAlerts(alerts: Alert[]) {
  console.log(JSON.stringify(alerts));
  const connection = await getConnection();
  return connection.manager.save(alerts);
}
