/** @ignore */
/**
 * Copyright (c) 2019-2020 FinancialForce.com, inc. All rights reserved.
 */

import axios from 'axios';
import { executeAnonymous, query } from '../salesforce/utils';
import { SalesforceConnection } from '../salesforce/connection';
import { PackageInfoI } from '../packageInfo/packageInfo';
import { MATCH_PATTERN_ANONYMOUS_CODE_OUTPUT, DEFAULT_NUMERIC_VALUE } from '../../shared/constants';

export const getIsLex = async (connectionData: SalesforceConnection): Promise<boolean> => {
	let isLex: boolean;
	const apex = 'User u = [SELECT UserPreferencesLightningExperiencePreferred FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1]; '
		+ 'System.assert(false, \'-_\' + u.UserPreferencesLightningExperiencePreferred + \'_-\');';
	const result = await executeAnonymous(connectionData, apex);
	const groups = result.exceptionMessage.match(MATCH_PATTERN_ANONYMOUS_CODE_OUTPUT);
	isLex = !!groups && groups[1] === 'true';

	return isLex;
};

export async function getUserInfoData(connection: SalesforceConnection) {
	const apex = 'Boolean isMulticurrency = UserInfo.isMultiCurrencyOrganization(); '
		+ 'System.assert(isMulticurrency);';

	const result = await executeAnonymous(connection, apex);

	return {
		isMulticurrency: result.success
	};
}

export async function getOrganizationData(connection: SalesforceConnection) {
	try {
	const organizationResponse: any = await query(connection, 'SELECT  Id, InstanceName, IsSandbox, OrganizationType, TrialExpirationDate FROM Organization', {});
	const organizationRecord = organizationResponse.records[0];

	const domainResponse: any = await query(connection, 'SELECT Domain FROM Domain', {});
	const domainRecord = domainResponse.records[0];

	const isTrial: any = (!organizationRecord.IsSandbox && organizationRecord.TrialExpirationDate !== null);
	return {
			orgID: organizationRecord.Id,
			orgInstance: organizationRecord.InstanceName,
			isSandbox: organizationRecord.IsSandbox,
			isTrial,
			orgType: organizationRecord.OrganizationType,
			orgCustomDomain: domainRecord.Domain
		};
	} catch (e) {
		console.log(`Error retrieving org information, error message: ${JSON.stringify(e)}`);
		return {
			orgID: '',
			orgInstance: '',
			isSandbox: undefined,
			isTrial: undefined,
			orgType: '',
			orgCustomDomain: ''
		};
	}
}

export async function getReleaseData(orgCustomDomain: string) {
	const response = await axios.get(`https://${orgCustomDomain}/services/data/`);
	const sfVersionsJSON = response.data;
	
	const lastRelease = sfVersionsJSON[sfVersionsJSON.length - 1];

	return {
		releaseVersion: lastRelease.label,
		apiVersion: lastRelease.version
	};
}

/*
 * Generate frontdoor IP to access SF
 * e.g. https://na72.salesforce.com/secur/frontdoor.jsp?sid=00D1H000000OroG!AQkAQKkRDe6ViDrWaoaVq5HanvIGRX_AcZ1hfGm_bJB4g_Fseqe9GWR4d6s3VhvjrDZBFyvsnhz2M6bmplnzqktXE.jzoU5p
 */
export async function getLoginUrl(connectionData: SalesforceConnection): Promise<string> {
	// FIXME - "Sending session IDs in a query string is insecure and is strongly discouraged."
	// https://help.salesforce.com/articleView?id=security_frontdoorjsp.htm
	// Suppress the Try LEX dialog by using the source URL parameter
	// https://help.salesforce.com/articleView?id=More-information-on-the-Try-Lightning-Experience-Now-prompt&language=en_US&type=1
	const retUrl = encodeURIComponent('home/home.jsp?source=lex');
	return `${connectionData.instanceUrl}/secur/frontdoor.jsp?sid=${encodeURIComponent(connectionData.accessToken)}&retURL=${retUrl}`;
}

export async function getPackagesInfo(connection: SalesforceConnection): Promise<PackageInfoI[]> {
	const packagesInfo: PackageInfoI[] = [];
	try {
		const getPackageInfoRetrieve: any =  await getPackageInfoData(connection);
		for (const packageInfo of getPackageInfoRetrieve.records) {
			let packageName: string = '';
			let packageVersion: string = '';
			let isBeta: boolean = false;
			let betaName: number = DEFAULT_NUMERIC_VALUE;

			if ( packageInfo.SubscriberPackageVersion.IsBeta )  {
				packageName = packageInfo.SubscriberPackage.Name;
				packageVersion = packageInfo.SubscriberPackageVersion.MajorVersion + '.' + packageInfo.SubscriberPackageVersion.MinorVersion;
				isBeta = true;
				betaName = Number(packageInfo.SubscriberPackageVersion.BuildNumber);
			} else {
				packageName = packageInfo.SubscriberPackage.Name;
				packageVersion = packageInfo.SubscriberPackageVersion.MajorVersion + '.' + packageInfo.SubscriberPackageVersion.MinorVersion + (packageInfo.SubscriberPackageVersion.PatchVersion !== 0 ? `.${packageInfo.SubscriberPackageVersion.PatchVersion}` : '');
			}
			packagesInfo.push({packageName, packageVersion, packageVersionId: `${packageInfo.SubscriberPackageVersion.Id}`, packageId: `${packageInfo.SubscriberPackage.Id}`, isBeta, betaName});
		}

	} catch (error) {
		console.log(`Error getting packages info: ${error}`);
	}

	return packagesInfo;
}

async function getPackageInfoData(connection: SalesforceConnection) {
	const apex = 'SELECT SubscriberPackage.Name,' +
	' SubscriberPackageVersion.MajorVersion,' +
	' SubscriberPackageVersion.MinorVersion,' +
	' SubscriberPackageVersion.PatchVersion,' +
	' SubscriberPackageVersion.Id,' +
	' SubscriberPackage.Id,' +
	' SubscriberPackageVersion.IsBeta, ' +
	' SubscriberPackageVersion.BuildNumber ' +
	' FROM InstalledSubscriberPackage';

	return new Promise((resolve, reject) => {
		connection.tooling.query(apex, {}, (error: any, response: any) => {
			if (error) {
				reject(error);
			} else {
				resolve(response);
			}
		});
	});
}

export async function retry<T>(fn: () => Promise<T>, retryCount = 3, initialWaitTimeMs = 1000, backoffMultiplier = 2): Promise<T> {
	let waitTimeMs = initialWaitTimeMs;
	for (let i = 0; i < retryCount; i++) {
	  try {
		const result = await fn();
		return result;
	  } catch (error) {
		console.error(`Error executing function. Retrying in ${waitTimeMs}ms. Error: ${error}`);
		await new Promise(resolve => setTimeout(resolve, waitTimeMs));
		waitTimeMs *= backoffMultiplier;
	  }
	}
	throw new Error(`Failed to execute function after ${retryCount} attempts.`);
}
  