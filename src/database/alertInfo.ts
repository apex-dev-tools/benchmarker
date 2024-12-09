import { getConnection } from './connection';
import { Alert } from './entity/alert';

export async function saveAlerts(alerts: Alert[]) {
  console.log(JSON.stringify(alerts));
  const connection = await getConnection();
  return connection.manager.save(alerts);
}

export async function getAverageValues(
  flowActionPairs: { flowName: string; actionName: string }[]
) {
  const connection = await getConnection();

  // Generate the query for all flow-action pairs
  const flowActionConditions = flowActionPairs
    .map(pair => `('${pair.flowName}', '${pair.actionName}')`)
    .join(', ');

  const query = `
    SELECT
      flow_name,
      action,
      ROUND(AVG(dml_statements)::numeric, 0) AS dmlavg,
      ROUND(AVG(soql_queries)::numeric, 0) AS soqlavg,
      ROUND(AVG(cpu_time)::numeric, 0) AS cpuavg,
      ROUND(AVG(dml_rows)::numeric, 0) AS dmlrowavg,
      ROUND(AVG(heap_size)::numeric, 0) AS heapavg,
      ROUND(AVG(query_rows)::numeric, 0) AS soqlrowavg,
      ROUND(AVG(duration)::numeric, 0) AS durationavg
    FROM performance.test_result
    WHERE (create_date_time >= CURRENT_TIMESTAMP - INTERVAL '7 DAYS')
      AND (flow_name, action) IN (${flowActionConditions})
    GROUP BY flow_name, action
  `;

  const resultsMap: {
    [key: string]: {
      dmlavg: number;
      soqlavg: number;
      cpuavg: number;
      dmlrowavg: number;
      heapavg: number;
      soqlrowavg: number;
      durationavg: number;
    };
  } = {};

  console.log('Generated query: ' + query);

  try {
    const result = await connection.query(query);
    console.log('Query response: ' + JSON.stringify(result));

    // Populate the results map
    result.forEach(
      (row: {
        flow_name: string;
        action: string;
        dmlavg: number;
        soqlavg: number;
        cpuavg: number;
        dmlrowavg: number;
        heapavg: number;
        soqlrowavg: number;
        durationavg: number;
      }) => {
        const key = `${row.flow_name}_${row.action}`;
        console.log('alertInfo.ts key ' + key);
        console.log('alertInfo.rows ' + JSON.stringify(row));
        // console.log(row.dmlavg);
        console.log(row.dmlavg);
        resultsMap[key] = {
          dmlavg: row.dmlavg ?? 0,
          soqlavg: row.soqlavg ?? 0,
          cpuavg: row.cpuavg ?? 0,
          dmlrowavg: row.dmlrowavg ?? 0,
          heapavg: row.heapavg ?? 0,
          soqlrowavg: row.soqlrowavg ?? 0,
          durationavg: row.durationavg ?? 0,
        };
      }
    );

    console.log('resultMap ' + JSON.stringify(resultsMap));
    return resultsMap;
  } catch (error) {
    console.error('Error fetching average values: ', error);
    return {};
  }
}
