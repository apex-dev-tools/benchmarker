/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import Table = require('cli-table');
import { TestResult } from '../entity/result';
import { filterData, hasDocumentLineValues } from './helper';

export const createTables = (data: TestResult[]) => {
	const { dataMetrics, dataErrors, dataGovernorLimits } = filterData(data);
	const standard = createTable(dataMetrics, outputStandard);
	const governorLimits = createTable(dataGovernorLimits, outputGobernorLimits);
	const errors = createTable(dataErrors, outputErrors);
	return { standard, governorLimits, errors };
};

const createTable = (data: TestResult[], output: DataTableRow[] ): string => {
	let fullOutput = [...output];
	if (hasDocumentLineValues(data)) {
		fullOutput = [
			...fullOutput.slice(0, 2),
			...outputDocumentLines,
			...fullOutput.slice(2)
		];
	}

	const tableColumns: string[] = fullOutput.map((item: DataTableRow) => item.label);

	const fieldsToExtract: string[] = fullOutput.map((item: DataTableRow) => item.field);
	const tableRows: string[][] = data.map((resultRow: TestResult ) => getValuesFromFields(fieldsToExtract, resultRow));

	if (tableRows.length === 0) {
		return '';
	}

	const table = new Table({
		head: tableColumns,
	});
	table.push(...tableRows);

	return table.toString();
};

const getValuesFromFields = (fields: string[], localDataResultRow: TestResult): string[] => fields.reduce(
	(acc: any[], field: string) => {
		acc.push(localDataResultRow[field]);
		return acc;
	},
	[]);

interface DataTableRow {
	label: string;
	field: string;
}

const outputDocumentLines: DataTableRow[] = [
	{ label: 'Number of Lines',
	field: 'dlpLines'},
	{ label: 'Number of Documents',
	field: 'dpDocuments'}
];

const outputStandard: DataTableRow[] = [
	{ label: 'Flow Name',
	field: 'flowName'},
	{ label: 'Action',
	field: 'action'},
	{ label: 'Duration (ms)',
	field: 'duration'}
];

const outputGobernorLimits: DataTableRow[] = [
	{ label: 'Flow Name',
	field: 'flowName'},
	{ label: 'Action',
	field: 'action'},
	{ label: 'Duration (ms)',
	field: 'duration'},
	{ label: 'CPU time (ms)',
	field: 'cpuTime'},
	{ label: 'DML rows',
	field: 'dmlRows'},
	{ label: 'DML statements',
	field: 'dmlStatements'},
	{ label: 'Heap size (bytes)',
	field: 'heapSize'},
	{ label: 'Query rows',
	field: 'queryRows'},
	{ label: 'SOQL queries',
	field: 'soqlQueries'}
];

const outputErrors: DataTableRow[] = [
	{ label: 'Flow Name',
	field: 'flowName'},
	{ label: 'Action',
	field: 'action'},
	{ label: 'Error Message',
	field: 'error'}
];
