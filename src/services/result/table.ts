/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import Table from 'cli-table';
import { TestResult } from '../../database/entity/result';
import {
  DEFAULT_NUMERIC_VALUE,
  DEFAULT_STRING_VALUE,
} from '../../shared/constants';
import { BenchmarkReporter } from './output';

interface DataTableRow {
  label: string;
  field: string;
}

const outputDocumentLines: DataTableRow[] = [
  { label: 'Number of Lines', field: 'dlpLines' },
  { label: 'Number of Documents', field: 'dpDocuments' },
];

const outputStandard: DataTableRow[] = [
  { label: 'Flow Name', field: 'flowName' },
  { label: 'Action', field: 'action' },
  { label: 'Duration (ms)', field: 'duration' },
];

const outputGovernorLimits: DataTableRow[] = [
  { label: 'Flow Name', field: 'flowName' },
  { label: 'Action', field: 'action' },
  { label: 'Duration (ms)', field: 'duration' },
  { label: 'CPU time (ms)', field: 'cpuTime' },
  { label: 'DML rows', field: 'dmlRows' },
  { label: 'DML statements', field: 'dmlStatements' },
  { label: 'Heap size (bytes)', field: 'heapSize' },
  { label: 'Query rows', field: 'queryRows' },
  { label: 'SOQL queries', field: 'soqlQueries' },
  { label: 'Queueables', field: 'queueableJobs' },
  { label: 'Futures', field: 'futureCalls' },
  { label: 'Load Time', field: 'loadTime' },
];

const outputErrors: DataTableRow[] = [
  { label: 'Flow Name', field: 'flowName' },
  { label: 'Action', field: 'action' },
  { label: 'Error Message', field: 'error' },
];

export class TableReporter implements BenchmarkReporter {
  name: string = 'Table';

  async report(results: TestResult[]) {
    const { standard, governorLimits, errors } = createTables(results);
    standard && console.log(standard);
    governorLimits && console.log(governorLimits);
    errors && console.log(errors);

    return Promise.resolve();
  }
}

function createTables(data: TestResult[]) {
  const { dataMetrics, dataErrors, dataGovernorLimits } = filterData(data);
  const standard = createTable(dataMetrics, outputStandard);
  const governorLimits = createTable(dataGovernorLimits, outputGovernorLimits);
  const errors = createTable(dataErrors, outputErrors);
  return { standard, governorLimits, errors };
}

function createTable(data: TestResult[], output: DataTableRow[]): string {
  let fullOutput = [...output];
  if (hasDocumentLineValues(data)) {
    fullOutput = [
      ...fullOutput.slice(0, 2),
      ...outputDocumentLines,
      ...fullOutput.slice(2),
    ];
  }

  const tableColumns: string[] = fullOutput.map(
    (item: DataTableRow) => item.label
  );

  const fieldsToExtract: string[] = fullOutput.map(
    (item: DataTableRow) => item.field
  );
  const tableRows: string[][] = data.map((resultRow: TestResult) =>
    getValuesFromFields(fieldsToExtract, resultRow)
  );

  if (tableRows.length === 0) {
    return '';
  }

  const table = new Table({
    head: tableColumns,
  });
  table.push(...tableRows);

  return table.toString();
}

function getValuesFromFields(
  fields: string[],
  localDataResultRow: TestResult
): string[] {
  return fields.reduce((acc: any[], field: string) => {
    acc.push(localDataResultRow[field]);
    return acc;
  }, []);
}

function filterData(data: TestResult[]) {
  const dataMetrics = data.filter(
    item =>
      isDefaultStringValue(item.error) &&
      isDefaultNumericValue(item.cpuTime) &&
      isDefaultNumericValue(item.dmlRows) &&
      isDefaultNumericValue(item.dmlStatements) &&
      isDefaultNumericValue(item.heapSize) &&
      isDefaultNumericValue(item.queryRows) &&
      isDefaultNumericValue(item.soqlQueries) &&
      isDefaultNumericValue(item.loadTime)
  );
  const dataGovernorLimits = data.filter(
    item =>
      isDefaultStringValue(item.error) &&
      (!isDefaultNumericValue(item.cpuTime) ||
        !isDefaultNumericValue(item.dmlRows) ||
        !isDefaultNumericValue(item.dmlStatements) ||
        !isDefaultNumericValue(item.heapSize) ||
        !isDefaultNumericValue(item.queryRows) ||
        !isDefaultNumericValue(item.soqlQueries) ||
        !isDefaultNumericValue(item.loadTime))
  );
  const dataErrors = data.filter(item => item.error !== '');
  return { dataMetrics, dataErrors, dataGovernorLimits };
}

function hasDocumentLineValues(data: TestResult[]): boolean {
  return data.some(
    item =>
      !isDefaultNumericValue(item.dlpLines) ||
      !isDefaultNumericValue(item.dpDocuments)
  );
}

function isDefaultNumericValue(field: number) {
  return field === DEFAULT_NUMERIC_VALUE;
}

function isDefaultStringValue(field: string) {
  return field === DEFAULT_STRING_VALUE;
}
