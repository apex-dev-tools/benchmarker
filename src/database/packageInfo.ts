/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { PackageInfo } from './entity/package';
import { getConnection } from './connection';

export async function savePackageInfo(packageInfo: PackageInfo[]) {
  const connection = await getConnection();
  return connection.manager.save(packageInfo);
}

export async function getPackagesByVersionId(packageVersionIds: string[]) {
  if (!packageVersionIds || packageVersionIds.length === 0) {
    return [];
  }
  const connection = await getConnection();
  const packages: PackageInfo[] = await connection
    .getRepository(PackageInfo)
    .createQueryBuilder('package')
    .where('package.package_version_id IN (:...packageVersionIds)', {
      packageVersionIds,
    })
    .getMany();

  return packages;
}
