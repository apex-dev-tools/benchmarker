/** @ignore */
/**
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { getConnection } from './connection';

export async function saveRecords<T>(records: T[]): Promise<T[]> {
  const connection = await getConnection();
  return connection.manager.save(records);
}
