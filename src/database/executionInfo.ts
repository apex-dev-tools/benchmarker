/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { ExecutionInfo } from './entity/execution';
import { getConnection } from './connection';

export async function saveExecutionInfo(executionInfo: ExecutionInfo[]) {
  const connection = await getConnection();
  return connection.manager.save(executionInfo);
}
