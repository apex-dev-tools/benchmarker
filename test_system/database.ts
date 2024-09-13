import { getConnection } from '../src/database/connection';

export async function cleanDatabase(): Promise<void> {
  try {
    const connection = await getConnection();
    const entities = connection.entityMetadatas;
    const tableNames = entities
      .map(entity => `${entity.schema}.${entity.tableName}`)
      .join(', ');

    await connection.query(`TRUNCATE ${tableNames} CASCADE;`);
  } catch (error) {
    throw new Error(`ERROR: Cleaning test database: ${error}`);
  }
}
