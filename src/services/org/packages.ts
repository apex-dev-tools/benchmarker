/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { Connection } from '@salesforce/core';

export interface Package {
  packageVersion: string;
  packageName: string;
  packageVersionId: string;
  packageId: string;
  isBeta: boolean;
  betaName: number;
}

export async function getPackagesOnOrg(
  connection: Connection
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
    let betaName: number = -1;

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

async function getPackageData(connection: Connection) {
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
