/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { getUserInfoData, getOrganizationData, getIsLex, getReleaseData, getPackagesInfo, retry } from './helper';
import { SalesforceConnection } from '../salesforce/connection';
import { PackageInfoI } from '../packageInfo/packageInfo';
import { OrgInfo } from '../../database/entity/org';
import { getOrgInfoById, saveOrgInfo } from '../../database/orgInfo';

export interface OrgInfoI {
	orgID: string;
	releaseVersion: string;
	apiVersion: string;
	orgType: string;
	orgInstance: string;
	isSandbox: boolean;
	isTrial: boolean;
	isMulticurrency: boolean;
	isLex: boolean;
}

export interface OrgContext {
	orgInfo: OrgInfoI;
	packagesInfo: PackageInfoI[];
}

export async function getOrgContext(connection: SalesforceConnection): Promise<OrgContext> {
	const { isMulticurrency } = await retry(() => getUserInfoData(connection));
	const { orgID, orgInstance, isSandbox, isTrial, orgType, orgCustomDomain } = await retry(() => getOrganizationData(connection));
	const isLex = await retry(() => getIsLex(connection));
	const { releaseVersion, apiVersion } = await retry(() => getReleaseData(orgCustomDomain));
	const packagesInfo: PackageInfoI[] = await retry(() => getPackagesInfo(connection));


	const orgInfo: OrgInfoI = {
		orgID,
		releaseVersion,
		apiVersion,
		orgType,
		isSandbox,
		isTrial,
		orgInstance,
		isMulticurrency,
		isLex
	};

	return {orgInfo, packagesInfo};
}

export async function createNewOrgInfo(orgInfoToSave: OrgInfoI): Promise<OrgInfo> {
	let orgInfo: OrgInfo| undefined = await getOrgInfoById(orgInfoToSave.orgID, orgInfoToSave.apiVersion);
	if (!orgInfo) {
		orgInfo = new OrgInfo();
		orgInfo.fillOrgContextInformation(orgInfoToSave);
		orgInfo = await saveOrgInfo(orgInfo);
	}
	return orgInfo;
}
