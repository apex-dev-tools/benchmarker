/** @ignore */
/* Generic DB helper to save an array of entities */
import { getConnection } from './connection';

export async function saveRecords<T>(rows: T[]): Promise<T[]> {
  const connection = await getConnection();
  return connection.manager.save(rows);
}
