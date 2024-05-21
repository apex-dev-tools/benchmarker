/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import axios from 'axios';
import { executeAnonymous, query } from '../salesforce/utils';
import { SalesforceConnection } from '../salesforce/connection';
import { MATCH_PATTERN_ANONYMOUS_CODE_OUTPUT } from '../../shared/constants';
import { Package } from './packages';

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

export const getIsLex = async (
  connectionData: SalesforceConnection
): Promise<boolean> => {
  const apex =
    'User u = [SELECT UserPreferencesLightningExperiencePreferred FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1]; ' +
    "System.assert(false, '-_' + u.UserPreferencesLightningExperiencePreferred + '_-');";
  const result = await executeAnonymous(connectionData, apex);
  const groups = result.exceptionMessage?.match(
    MATCH_PATTERN_ANONYMOUS_CODE_OUTPUT
  );

  return !!groups && groups[1] === 'true';
};

export async function getUserInfoData(connection: SalesforceConnection) {
  const apex =
    'Boolean isMulticurrency = UserInfo.isMultiCurrencyOrganization(); ' +
    'System.assert(isMulticurrency);';

  const result = await executeAnonymous(connection, apex);

  return {
    isMulticurrency: result.success,
  };
}

export async function getOrganizationData(connection: SalesforceConnection) {
  const organizationResponse: any = await query(
    connection,
    'SELECT  Id, InstanceName, IsSandbox, OrganizationType, TrialExpirationDate FROM Organization'
  );
  const organizationRecord = organizationResponse.records[0];

  const domainResponse: any = await query(
    connection,
    'SELECT Domain FROM Domain'
  );
  const domainRecord = domainResponse.records[0];

  const isTrial: any =
    !organizationRecord.IsSandbox &&
    organizationRecord.TrialExpirationDate !== null;
  return {
    orgID: organizationRecord.Id,
    orgInstance: organizationRecord.InstanceName,
    isSandbox: organizationRecord.IsSandbox,
    isTrial,
    orgType: organizationRecord.OrganizationType,
    orgCustomDomain: domainRecord.Domain,
  };
}

export async function getReleaseData(orgCustomDomain: string) {
  const response = await axios.get(`https://${orgCustomDomain}/services/data/`);
  const sfVersionsJSON = response.data;

  const lastRelease = sfVersionsJSON[sfVersionsJSON.length - 1];

  return {
    releaseVersion: lastRelease.label,
    apiVersion: lastRelease.version,
  };
}
