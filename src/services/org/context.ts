/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { executeAnonymous } from '../../org/execute';
import { Package } from './packages';
import { Connection } from '@salesforce/core';

export interface Org {
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
  orgInfo: Org;
  packagesInfo: Package[];
}

interface Version {
  label: string;
  url: string;
  version: string;
}

export async function getUserInfoData(connection: Connection) {
  const apex =
    'Boolean isMulticurrency = UserInfo.isMultiCurrencyOrganization(); ' +
    'System.assert(isMulticurrency);';

  const result = await executeAnonymous(connection, apex);

  return {
    isMulticurrency: result.success,
  };
}

export async function getOrganizationData(connection: Connection) {
  const organizationResponse: any = await connection.query(
    'SELECT Id, InstanceName, IsSandbox, OrganizationType, TrialExpirationDate FROM Organization'
  );
  const organizationRecord = organizationResponse.records[0];

  const isTrial: any =
    !organizationRecord.IsSandbox &&
    organizationRecord.TrialExpirationDate !== null;
  return {
    orgID: organizationRecord.Id,
    orgInstance: organizationRecord.InstanceName,
    isSandbox: organizationRecord.IsSandbox,
    isTrial,
    orgType: organizationRecord.OrganizationType,
  };
}

export async function getReleaseData(connection: Connection) {
  const res = await connection.request<Version[]>(
    `${connection.instanceUrl}/services/data`
  );
  const lastRelease = res.at(-1);

  return {
    releaseVersion: lastRelease?.label || '',
    apiVersion: lastRelease?.version || '',
  };
}
