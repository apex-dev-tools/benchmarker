/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { ExecutionInfo } from './entity/execution';
import { runningOnLocalMode } from '../services/localMode';

import { getConnection } from './connection';

const bulkSave = async function(executionInfos: ExecutionInfo[]) {
	const connection = await getConnection();
	const executionInfosInserted = await connection.manager.save(executionInfos);
	return executionInfosInserted;
};

export const executionInfoModel: ExecutionInfoModel = {
	bulkSave
};

interface ExecutionInfoModel {
	bulkSave(executionInfos: ExecutionInfo[]): Promise<ExecutionInfo[]>;
}

export async function bulkSaveExecutionInfo(executionInfo: ExecutionInfo[]) {
	if (!runningOnLocalMode()) {
		return await executionInfoModel.bulkSave(executionInfo);
	} else {
		return [new ExecutionInfo()];
	}
}
