/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { TestResult } from '../entity/result';
import { DEFAULT_NUMERIC_VALUE, DEFAULT_STRING_VALUE } from '../../shared/constants';

export const filterData = (data: TestResult[]) => {
	const dataMetrics = data.filter(item =>
		isDefaultStringValue(item.error) && (
			isDefaultNumericValue(item.cpuTime) &&
			isDefaultNumericValue(item.dmlRows) &&
			isDefaultNumericValue(item.dmlStatements) &&
			isDefaultNumericValue(item.heapSize) &&
			isDefaultNumericValue(item.queryRows) &&
			isDefaultNumericValue(item.soqlQueries)
		)
	);
	const dataGovernorLimits = data.filter(item =>
		isDefaultStringValue(item.error) && (
			!isDefaultNumericValue(item.cpuTime) ||
			!isDefaultNumericValue(item.dmlRows) ||
			!isDefaultNumericValue(item.dmlStatements) ||
			!isDefaultNumericValue(item.heapSize) ||
			!isDefaultNumericValue(item.queryRows) ||
			!isDefaultNumericValue(item.soqlQueries)
		)
	);
	const dataErrors = data.filter(item => item.error !== '');
	return { dataMetrics, dataErrors, dataGovernorLimits};
};

export const hasDocumentLineValues = (data: TestResult[]) => data.some((item) => !isDefaultNumericValue(item.dlpLines) || !isDefaultNumericValue(item.dpDocuments));

export const isDefaultNumericValue = (field: number) => field === DEFAULT_NUMERIC_VALUE;
const isDefaultStringValue = (field: string) => field === DEFAULT_STRING_VALUE;
