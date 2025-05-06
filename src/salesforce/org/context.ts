/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { Connection } from '@salesforce/core';
import { executeAnonymous, extractAssertionData } from '../execute';
import { NamedSchema } from '../../parser/json';

export interface OrgInformation {
  id: string;
  instance: string;
  edition: string;
  isSandbox: boolean;
  isTrial: boolean;
  isMultiCurrency: boolean;
  isLex: boolean;
}

export interface OrgRelease {
  label: string;
  url: string;
  version: string;
}

export interface OrgPackage {
  id: string;
  name: string;
  namespace: string;
  version: string;
  versionId: string;
  buildNumber: number;
  isBeta: boolean;
}

export interface OrgContext extends OrgInformation {
  release: OrgRelease;
  packages: OrgPackage[];
}

interface InstalledSubscriberPackage {
  SubscriberPackage: {
    Id: string;
    Name: string;
    NamespacePrefix: string | null;
  };
  SubscriberPackageVersion: {
    Id: string;
    MajorVersion: number | null;
    MinorVersion: number | null;
    PatchVersion: number | null;
    IsBeta: boolean;
    IsManaged: boolean;
    BuildNumber: number | null;
  };
}

const orgInfoSchema: NamedSchema<OrgInformation> = {
  name: 'orgInfo',
  schema: {
    properties: {
      id: { type: 'string' },
      instance: { type: 'string' },
      edition: { type: 'string' },
      isSandbox: { type: 'boolean' },
      isTrial: { type: 'boolean' },
      isMultiCurrency: { type: 'boolean' },
      isLex: { type: 'boolean' },
    },
  },
};

export async function getOrgContext(
  connection: Connection
): Promise<OrgContext> {
  const resp = await executeAnonymous(
    connection,
    require('../../../scripts/apex/info.apex')
  );

  return {
    ...extractAssertionData(resp, orgInfoSchema),
    release: await getCurrentRelease(connection),
    packages: await getInstalledPackages(connection),
  };
}

async function getCurrentRelease(connection: Connection): Promise<OrgRelease> {
  const res = await connection.request(
    `${connection.instanceUrl}/services/data`
  );

  // Non-array response indicates an error with instanceUrl
  if (!Array.isArray(res)) {
    throw new Error(
      'Failed to retrieve org API versions, invalid connection domain.'
    );
  }

  return res.at(-1) as OrgRelease;
}

async function getInstalledPackages(
  connection: Connection
): Promise<OrgPackage[]> {
  const res = await connection.tooling
    .sobject('InstalledSubscriberPackage')
    .select<InstalledSubscriberPackage>([
      { SubscriberPackage: ['Id', 'Name', 'NamespacePrefix'] },
      {
        SubscriberPackageVersion: [
          'Id',
          'MajorVersion',
          'MinorVersion',
          'PatchVersion',
          'IsBeta',
          'BuildNumber',
        ],
      },
    ])
    .execute();

  return res.map(resolvePackageInformation);
}

function resolvePackageInformation({
  SubscriberPackage: sp,
  SubscriberPackageVersion: spv,
}: InstalledSubscriberPackage): OrgPackage {
  return {
    id: sp.Id,
    name: sp.Name,
    namespace: sp.NamespacePrefix || '',
    version: `${spv.MajorVersion || 0}.${spv.MinorVersion || 0}.${spv.PatchVersion || 0}`,
    versionId: spv.Id,
    buildNumber: spv.BuildNumber || 0,
    isBeta: spv.IsBeta,
  };
}
