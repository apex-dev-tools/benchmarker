/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { DEFAULT_NUMERIC_VALUE } from '../../shared/constants';
import { SalesforceConnection } from '../salesforce/connection';

export interface Package {
  packageVersion: string;
  packageName: string;
  packageVersionId: string;
  packageId: string;
  isBeta: boolean;
  betaName: number;
}

export async function getPackagesOnOrg(
  connection: SalesforceConnection
): Promise<Package[]> {
  const packages: Package[] = [];
  const packageData: any = await getPackageData(connection);
  for (const {
    SubscriberPackage,
    SubscriberPackageVersion,
  } of packageData.records) {
    const packageName: string = SubscriberPackage.Name;
    let packageVersion: string = '';
    let isBeta: boolean = false;
    let betaName: number = DEFAULT_NUMERIC_VALUE;

    if (SubscriberPackageVersion.IsBeta) {
      packageVersion =
        SubscriberPackageVersion.MajorVersion +
        '.' +
        SubscriberPackageVersion.MinorVersion;
      isBeta = true;
      betaName = Number(SubscriberPackageVersion.BuildNumber);
    } else {
      packageVersion =
        SubscriberPackageVersion.MajorVersion +
        '.' +
        SubscriberPackageVersion.MinorVersion +
        (SubscriberPackageVersion.PatchVersion !== 0
          ? `.${SubscriberPackageVersion.PatchVersion}`
          : '');
    }
    packages.push({
      packageName,
      packageVersion,
      packageVersionId: `${SubscriberPackageVersion.Id}`,
      packageId: `${SubscriberPackage.Id}`,
      isBeta,
      betaName,
    });
  }

  return packages;
}

async function getPackageData(connection: SalesforceConnection) {
  return connection.tooling.query(
    'SELECT SubscriberPackage.Name,' +
      ' SubscriberPackageVersion.MajorVersion,' +
      ' SubscriberPackageVersion.MinorVersion,' +
      ' SubscriberPackageVersion.PatchVersion,' +
      ' SubscriberPackageVersion.Id,' +
      ' SubscriberPackage.Id,' +
      ' SubscriberPackageVersion.IsBeta, ' +
      ' SubscriberPackageVersion.BuildNumber ' +
      ' FROM InstalledSubscriberPackage'
  );
}
