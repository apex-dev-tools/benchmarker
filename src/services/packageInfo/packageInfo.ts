/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { getNonDuplicates } from './helper';
import { savePackageInfo, getPackagesByVersionId } from '../../database/packageInfo';
import { PackageInfo } from '../../database/entity/package';

export interface PackageInfoI {
	packageVersion: string;
	packageName: string;
	packageVersionId: string;
	packageId: string;
	isBeta: boolean;
	betaName: number;
}

export async function createNewPackages(packagesInfo: PackageInfoI[]) {
	const newPackages = await getNonDuplicates(packagesInfo);
	const insertedPackages: PackageInfoI[] = [];
	for (const newPackage of newPackages) {
		const insertedPackage = await savePackageInfo(newPackage.packageVersion, newPackage.packageName, newPackage.packageVersionId, newPackage.packageId, newPackage.isBeta, newPackage.betaName);
		insertedPackages.push(insertedPackage);
	}

	return insertedPackages;
}

export async function getPackageInfoByPackageVersionId(packagesInfo: PackageInfoI[]): Promise<PackageInfo[]> {
	const packageVersionIds: string[] = packagesInfo.map((packageInfo: PackageInfoI) => packageInfo.packageVersionId);
	const packages: PackageInfo[] = await getPackagesByVersionId( packageVersionIds );
	return packages;
}
