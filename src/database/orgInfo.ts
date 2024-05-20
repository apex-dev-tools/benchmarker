/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { OrgInfo } from './entity/org';
import { getConnection } from './connection';

export async function saveOrgInfo(orgInfo: OrgInfo) {
  const connection = await getConnection();
  return connection.manager.save(orgInfo);
}

export async function getOrgInfoById(orgId: string, apiVersion: string) {
  if (!orgId || !apiVersion) {
    return null;
  }
  const connection = await getConnection();
  const orgInfo: OrgInfo | null = await connection
    .getRepository(OrgInfo)
    .createQueryBuilder('org')
    .where('org.org_id = :orgId', { orgId })
    .andWhere('org.api_version = :apiVersion', { apiVersion })
    .getOne();

  return orgInfo;
}
