/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import {
  Org,
  OrgContext,
  getIsLex,
  getOrganizationData,
  getReleaseData,
  getUserInfoData,
} from './org/context';
import { Package, getPackagesOnOrg } from './org/packages';
import { SalesforceConnection } from './salesforce/connection';
import { retry } from './salesforce/utils';

export async function getOrgContext(
  connection: SalesforceConnection
): Promise<OrgContext> {
  const { isMulticurrency } = await retry(() => getUserInfoData(connection));
  const { orgID, orgInstance, isSandbox, isTrial, orgType, orgCustomDomain } =
    await retry(() => getOrganizationData(connection));
  const isLex = await retry(() => getIsLex(connection));
  const { releaseVersion, apiVersion } = await retry(() =>
    getReleaseData(orgCustomDomain)
  );
  const packagesInfo: Package[] = await retry(() =>
    getPackagesOnOrg(connection)
  );

  const orgInfo: Org = {
    orgID,
    releaseVersion,
    apiVersion,
    orgType,
    isSandbox,
    isTrial,
    orgInstance,
    isMulticurrency,
    isLex,
  };

  return { orgInfo, packagesInfo };
}
