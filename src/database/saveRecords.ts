/** @ignore */
/**
 * Copyright (c) 2025 FinancialForce.com, inc. All rights reserved.
 */
import { getConnection } from './connection';

export async function saveRecords<T>(rows: T[]): Promise<T[]> {
  const connection = await getConnection();
  return connection.manager.save(rows);
}
