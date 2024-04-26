/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { OrgInfo } from './entity/org';
import { getConnection } from './connection';
import { runningOnLocalMode } from '../services/localMode';

const save = async function(executionInfo: OrgInfo) {
	const connection = await getConnection();
	return connection.manager.save(executionInfo);
};

const getOrgInfoByOrgId = async function(orgId: string, apiVersion: string): Promise<OrgInfo|undefined> {
	const connection = await getConnection();
	const orgInfo: OrgInfo|undefined = await connection
		.getRepository(OrgInfo)
		.createQueryBuilder('org')
		.where('org.org_id = :orgId', {orgId})
		.andWhere('org.api_version = :apiVersion', {apiVersion})
		.getOne();

	return orgInfo;
};

export const orgInfoModel: OrgInfoModel = {
	save,
	getOrgInfoByOrgId
};

interface OrgInfoModel {
	save(executionInfo: OrgInfo): Promise<OrgInfo>;
	getOrgInfoByOrgId(orgId: string, apiVersion: string): Promise<OrgInfo|undefined>;
}

export async function saveOrgInfo(orgInfo: OrgInfo) {
	if (!runningOnLocalMode()) {
		return await orgInfoModel.save(orgInfo);
	} else {
		return new OrgInfo();
	}
}

export async function getOrgInfoById(orgId: string, apiVersion: string) {
	if (!runningOnLocalMode()) {
		return await orgInfoModel.getOrgInfoByOrgId(orgId, apiVersion);
	} else {
		return new OrgInfo();
	}
}
