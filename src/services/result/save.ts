/** @ignore */
/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { ExecutionInfo } from '../../database/entity/execution';
import { OrgInfo } from '../../database/entity/org';
import { PackageInfo } from '../../database/entity/package';
import { TestResult } from '../../database/entity/result';
import { saveExecutionInfo } from '../../database/executionInfo';
import { getOrgInfoById, saveOrgInfo } from '../../database/orgInfo';
import {
  getPackagesByVersionId,
  savePackageInfo,
} from '../../database/packageInfo';
import { saveTestResult } from '../../database/testResult';
import { getExternalBuildId } from '../../shared/env';
import { Org, OrgContext } from '../org/context';
import { Package } from '../org/packages';

export async function save(
  testResults: TestResult[],
  orgContext: OrgContext
): Promise<void> {
  const testResultsDB: TestResult[] = await saveTestResults(testResults);
  const orgInfoDB: OrgInfo = await saveOrg(orgContext.orgInfo);
  const packagesDB: PackageInfo[] = await savePackages(orgContext.packagesInfo);
  const executionInfoRows = generateExecutionInfoRows(
    testResultsDB.map(tr => tr.id),
    orgInfoDB.id,
    packagesDB.map(pkg => pkg.id)
  );
  await saveExecutionInfo(executionInfoRows);
}

function generateExecutionInfoRows(
  testResultsIds: number[],
  orgInfoId: number,
  packagesId: number[]
): ExecutionInfo[] {
  const externalBuildId = getExternalBuildId();

  return testResultsIds.flatMap((testResultId: number) => {
    if (packagesId.length) {
      return packagesId.map((packageInfoId: number) =>
        createExecutionInfo(
          testResultId,
          orgInfoId,
          packageInfoId,
          externalBuildId
        )
      );
    }

    // packagesId could be empty for completely unmanaged org
    return [
      createExecutionInfo(testResultId, orgInfoId, null, externalBuildId),
    ];
  });
}

function createExecutionInfo(
  resultId: number,
  orgInfoId: number,
  packageId: number | null,
  buildId: string
): ExecutionInfo {
  const executionInfo: ExecutionInfo = new ExecutionInfo();
  executionInfo.testResultId = resultId;
  executionInfo.orgInfoId = orgInfoId;
  if (packageId != null) executionInfo.packageInfoId = packageId;
  executionInfo.externalBuildId = buildId;

  return executionInfo;
}

async function saveTestResults(results: TestResult[]): Promise<TestResult[]> {
  return saveTestResult(results);
}

async function saveOrg(orgInfoToSave: Org): Promise<OrgInfo> {
  let orgInfo: OrgInfo | null = await getOrgInfoById(
    orgInfoToSave.orgID,
    orgInfoToSave.apiVersion
  );
  if (!orgInfo) {
    orgInfo = new OrgInfo();
    orgInfo.fillOrgContextInformation(orgInfoToSave);
    orgInfo = await saveOrgInfo(orgInfo);
  }
  return orgInfo;
}

async function savePackages(packagesInfo: Package[]) {
  const existingPackages = await getPackagesByVersionId(
    packagesInfo.map(pkg => pkg.packageVersionId)
  );
  const insertedPackages = await savePackageInfo(
    filterNewPackages(packagesInfo, existingPackages).map(pkg => {
      const info = new PackageInfo();
      info.packageVersion = pkg.packageVersion;
      info.packageName = pkg.packageName;
      info.packageVersionId = pkg.packageVersionId;
      info.packageId = pkg.packageId;
      info.isBeta = pkg.isBeta;
      info.betaName = pkg.betaName;

      return info;
    })
  );

  return [...existingPackages, ...insertedPackages];
}

function filterNewPackages(
  packagesInfo: Package[],
  existing: PackageInfo[]
): Package[] {
  const ids = new Set(existing.map(p => p.packageVersionId));
  const newPackages: Package[] = existing.length
    ? packagesInfo.filter(pkg => !ids.has(pkg.packageVersionId))
    : packagesInfo;

  return newPackages;
}
