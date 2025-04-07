/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { Connection } from '@salesforce/core';
import {
  Org,
  OrgContext,
  getOrganizationData,
  getReleaseData,
  getUserInfoData,
} from './org/context';
import { Package, getPackagesOnOrg } from './org/packages';

export async function getOrgContext(
  connection: Connection
): Promise<OrgContext> {
  const { isMulticurrency } = await getUserInfoData(connection);
  const { orgID, orgInstance, isSandbox, isTrial, orgType } =
    await getOrganizationData(connection);
  const { releaseVersion, apiVersion } = await getReleaseData(connection);
  const packagesInfo: Package[] = await getPackagesOnOrg(connection);

  const orgInfo: Org = {
    orgID,
    releaseVersion,
    apiVersion,
    orgType,
    isSandbox,
    isTrial,
    orgInstance,
    isMulticurrency,
    isLex: true,
  };

  return { orgInfo, packagesInfo };
}
