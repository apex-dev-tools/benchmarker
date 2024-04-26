/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { PackageInfo } from './entity/package';
import { getConnection } from './connection';
import { runningOnLocalMode } from '../services/localMode';

const save = async function(packageVersion: string, packageName: string, packageVersionId: string, packageId: string, isBeta: boolean, betaName: number): Promise<PackageInfo> {
	const connection = await getConnection();
	return connection.manager.save(new PackageInfo(packageName, packageVersion, packageVersionId, packageId, isBeta, betaName));
};

const getPackagesBySubscriberVersionId = async function(packageVersionIds: string[]): Promise<PackageInfo[]> {
	const connection = await getConnection();
	const packages: PackageInfo[] = await connection
		.getRepository(PackageInfo)
		.createQueryBuilder('package')
		.where('package.package_version_id IN (:...packageVersionIds)', {packageVersionIds})
		.getMany();

	return packages;
};
export const packageInfoModel: PackageInfoModel = {
	save,
	getPackagesBySubscriberVersionId
};

interface PackageInfoModel {
	save(packageVersion: string, packageName: string, packageVersionId: string, packageId: string, isBeta: boolean, betaName: number): Promise<PackageInfo> ;
	getPackagesBySubscriberVersionId(packageVersionIds: string[]): Promise<PackageInfo[]>;
}

export async function savePackageInfo(packageVersion: string, packageName: string, packageVersionId: string, packageId: string, isBeta: boolean, betaName: number) {
	if (!runningOnLocalMode()) {
		return await packageInfoModel.save(packageVersion, packageName, packageVersionId, packageId, isBeta, betaName);
	} else {
		return new PackageInfo('', '', '', '', false, 0);
	}
}

export async function getPackagesByVersionId(packageVersionIds: string[]) {
	if (!runningOnLocalMode()) {
		return await packageInfoModel.getPackagesBySubscriberVersionId(packageVersionIds);
	} else {
		return [new PackageInfo('', '', '', '', false, 0)];
	}
}
