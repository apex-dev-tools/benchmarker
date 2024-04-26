/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { PackageInfoI } from './packageInfo';
import { PackageInfo } from '../../database/entity/package';
import { getPackagesByVersionId } from '../../database/packageInfo';

export async function getNonDuplicates(packagesInfo: PackageInfoI[]): Promise<PackageInfoI[]> {
	const packageVersionIds = packagesInfo.
			map((packageInfo: PackageInfoI) => packageInfo.packageVersionId);

	const packages: PackageInfo[] = await getPackagesByVersionId(packageVersionIds);

	const newPackages: PackageInfoI[] = packages.length ? packagesInfo.
			filter((orgPackageInfo: PackageInfoI) =>
				!packages
					.some((packageInfo: PackageInfo) =>
							orgPackageInfo.packageVersionId === packageInfo.packageVersionId
					)
		) : packagesInfo;

	return newPackages;
}
