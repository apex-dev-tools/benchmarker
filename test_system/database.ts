import { getConnection } from '../src/database/connection';
import { Alert } from '../src/database/entity/alert';

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

export async function getAlerts(
  flow_name: string,
  action_name: string
): Promise<Alert[]> {
  const ALERT_TABLE_NAME: string = 'alert';
  try {
    const connection = await getConnection();
    const entities = connection.entityMetadatas;
    const table = entities.find(
      entity => entity.tableName === ALERT_TABLE_NAME
    );
    return await connection.query(
      `SELECT 
        flow_name, 
        action, 
        test_result_id 
      FROM ${table?.schema}.${table?.tableName} 
      WHERE 
        flow_name='${flow_name}' 
        AND action='${action_name}'`
    );
  } catch (error) {
    throw new Error(
      `ERROR: Getting the alerts from database. ${error.message}`
    );
  }
}
