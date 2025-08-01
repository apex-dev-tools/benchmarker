/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { Brackets, DataSource, In, Repository } from 'typeorm';
import { TestResult } from './entity/result.js';
import { LimitsAvg } from '../../metrics/limits.js';
import { CommonDataUtil, PostgresCommonDataMapper } from '../interop.js';
import { Alert } from './entity/alert.js';
import { ExecutionInfo } from './entity/execution.js';
import { OrgInfo } from './entity/org.js';
import { PackageInfo } from './entity/package.js';
import { LimitsBenchmarkResult } from '../../service/apex.js';
import { OrgContext, OrgPackage } from '../../salesforce/org/context.js';
import { RunContext } from '../../state/context.js';
import { Degradation } from '../../metrics/limits/deg.js';
import { TestInfo } from './entity/info.js';

export class LegacyDataMapper implements PostgresCommonDataMapper {
  dataSource: DataSource;
  alerts: Repository<Alert>;
  executions: Repository<ExecutionInfo>;
  orgs: Repository<OrgInfo>;
  packages: Repository<PackageInfo>;
  testResults: Repository<TestResult>;
  testInfos: Repository<TestInfo>;

  protected orgRecordIds: Partial<Record<string, number>>;
  protected packageRecordIds: Partial<Record<string, number[]>>;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.alerts = dataSource.getRepository(Alert);
    this.executions = dataSource.getRepository(ExecutionInfo);
    this.orgs = dataSource.getRepository(OrgInfo);
    this.packages = dataSource.getRepository(PackageInfo);
    this.testResults = dataSource.getRepository(TestResult);
    this.testInfos = dataSource.getRepository(TestInfo);
    this.orgRecordIds = {};
    this.packageRecordIds = {};
  }

  async saveLimitsResults(
    run: RunContext,
    org: OrgContext,
    results: LimitsBenchmarkResult[]
  ): Promise<void> {
    const orgId = await this.saveAndCacheOrg(org);
    const packageIds = await this.saveAndCachePackages(org);
    const tests = await this.saveTestResults(run, results);

    await this.saveExecutionInfo(
      tests.map(t => t.id),
      orgId,
      packageIds,
      run.buildId
    );

    await this.saveTestInfo(run.projectId, results);
    await this.saveDegradationAlerts(results, tests);
  }

  async findLimitsTenDayAverage(
    projectId: string,
    results: LimitsBenchmarkResult[]
  ): Promise<LimitsAvg[]> {
    const { names, actions } = CommonDataUtil.idSetsFromResults(results);

    return this.testResults
      .createQueryBuilder('res')
      .select('res.flow_name', 'name')
      .addSelect('res.action', 'action')
      .addSelect('COALESCE(ROUND(AVG(res.duration), 0), 0)::int', 'duration')
      .addSelect('COALESCE(ROUND(AVG(res.cpu_time), 0), 0)::int', 'cpuTime')
      .addSelect('COALESCE(ROUND(AVG(res.dml_rows), 0), 0)::int', 'dmlRows')
      .addSelect(
        'COALESCE(ROUND(AVG(res.dml_statements), 0), 0)::int',
        'dmlStatements'
      )
      .addSelect('COALESCE(ROUND(AVG(res.heap_size), 0), 0)::int', 'heapSize')
      .addSelect('COALESCE(ROUND(AVG(res.query_rows), 0), 0)::int', 'queryRows')
      .addSelect(
        'COALESCE(ROUND(AVG(res.soql_queries), 0), 0)::int',
        'soqlQueries'
      )
      .addSelect(
        'COALESCE(ROUND(AVG(res.queueable_jobs), 0), 0)::int',
        'queueableJobs'
      )
      .addSelect(
        'COALESCE(ROUND(AVG(res.future_calls), 0), 0)::int',
        'futureCalls'
      )
      .where('res.product = :projectId', { projectId })
      .andWhere('res.flow_name IN (:...names)', { names })
      .andWhere('res.action IN (:...actions)', {
        actions,
      })
      .andWhere(
        new Brackets(qb => qb.where('error IS NULL').orWhere("error = ''"))
      )
      .andWhere(
        "res.create_date_time >= CURRENT_TIMESTAMP - INTERVAL '10 DAYS'"
      )
      .groupBy('res.flow_name')
      .addGroupBy('res.action')
      .having('COUNT(*) >= 5')
      .getRawMany();
  }

  private async saveAndCacheOrg(orgContext: OrgContext): Promise<number> {
    const cachedId = this.orgRecordIds[orgContext.id];
    if (cachedId != null) return cachedId;

    const org = await this.saveOrgIfNotExists(orgContext);
    return (this.orgRecordIds[orgContext.id] = org.id);
  }

  private async saveOrgIfNotExists(orgContext: OrgContext): Promise<OrgInfo> {
    // legacy has separate records per api version
    // tied to results via ExecutionInfo
    let org = await this.orgs.findOneBy({
      orgId: orgContext.id,
      apiVersion: orgContext.release.version,
    });

    if (!org) {
      org = await this.orgs.save(
        this.orgs.create({
          apiVersion: orgContext.release.version,
          instance: orgContext.instance,
          isLex: orgContext.isLex,
          isMulticurrency: orgContext.isMultiCurrency,
          isSandbox: orgContext.isSandbox,
          isTrial: orgContext.isTrial,
          orgId: orgContext.id,
          orgType: orgContext.edition,
          releaseVersion: orgContext.release.label,
        })
      );
    }

    return org;
  }

  private async saveAndCachePackages(
    orgContext: OrgContext
  ): Promise<number[]> {
    const cachedId = this.packageRecordIds[orgContext.id];
    if (cachedId != null) return cachedId;

    const packages = await this.savePackagesIfNotExists(orgContext.packages);
    return (this.packageRecordIds[orgContext.id] = packages.map(p => p.id));
  }

  private async savePackagesIfNotExists(
    packages: OrgPackage[]
  ): Promise<PackageInfo[]> {
    if (packages.length === 0) return [];

    const existing = await this.packages.findBy({
      packageVersionId: In(packages.map(p => p.versionId)),
    });

    if (existing.length === packages.length) {
      return existing;
    } else if (existing.length) {
      const existingIds = new Set(existing.map(p => p.packageVersionId));
      const saved = await this.savePackages(
        packages.filter(p => !existingIds.has(p.versionId))
      );

      return [...existing, ...saved];
    }

    return this.savePackages(packages);
  }

  private async savePackages(packages: OrgPackage[]): Promise<PackageInfo[]> {
    return this.packages.save(
      packages.map(m =>
        this.packages.create({
          betaName: m.buildNumber,
          isBeta: m.isBeta,
          packageId: m.id,
          packageName: m.name,
          packageVersion: m.version,
          packageVersionId: m.versionId,
        })
      )
    );
  }

  private async saveTestResults(
    run: RunContext,
    results: LimitsBenchmarkResult[]
  ): Promise<TestResult[]> {
    return this.testResults.save(
      results.map(({ name, action, data }) =>
        this.testResults.create({
          product: run.projectId,
          sourceRef: run.sourceId,
          flowName: name,
          action,
          testType: 'Transaction Process',
          duration: data.duration,
          cpuTime: data.cpuTime,
          dmlRows: data.dmlRows,
          dmlStatements: data.dmlStatements,
          heapSize: data.heapSize,
          queryRows: data.queryRows,
          soqlQueries: data.soqlQueries,
          queueableJobs: data.queueableJobs,
          futureCalls: data.futureCalls,
        })
      )
    );
  }

  private async saveExecutionInfo(
    testIds: number[],
    orgInfoId: number,
    packageInfoIds: number[],
    externalBuildId?: string
  ): Promise<void> {
    let executions: ExecutionInfo[];
    if (packageInfoIds.length) {
      executions = testIds.flatMap(testResultId =>
        packageInfoIds.map(packageInfoId =>
          this.executions.create({
            testResultId,
            orgInfoId,
            packageInfoId,
            externalBuildId,
          })
        )
      );
    } else {
      executions = testIds.map(testResultId =>
        this.executions.create({
          testResultId,
          orgInfoId,
          externalBuildId,
        })
      );
    }

    await this.executions.save(executions);
  }

  private async saveTestInfo(
    product: string,
    results: LimitsBenchmarkResult[]
  ): Promise<void> {
    const { names, actions } = CommonDataUtil.idSetsFromResults(results);
    const infoRecords = await this.testInfos.findBy({
      product,
      flowName: In(names),
      action: In(actions),
    });
    const infoDict = infoRecords.reduce<Partial<Record<string, TestInfo>>>(
      (dict, info) => {
        dict[info.flowName + info.action] = info;
        return dict;
      },
      {}
    );

    // As in previous version, info is created regardless if data is set
    await this.testInfos.save(
      results.map(
        ({ name, action, context }) =>
          infoDict[name + action] ||
          this.testInfos.create({
            product,
            flowName: name,
            action: action,
            additionalData: this.ensureJson(context?.data),
          })
      )
    );
  }

  private async saveDegradationAlerts(
    results: LimitsBenchmarkResult[],
    testRecords: TestResult[]
  ): Promise<void> {
    const deg = results.filter(r => r.deg);
    if (deg.length === 0) return;

    const testIds = testRecords.reduce<Record<string, number>>((dict, rec) => {
      dict[rec.flowName + rec.action] = rec.id;
      return dict;
    }, {});

    const records = deg.reduce<Alert[]>((alerts, { name, action, deg }) => {
      if (deg) {
        alerts.push(
          this.alerts.create({
            flowName: name,
            action,
            testResultId: testIds[name + action],
            cpuTimeDegraded: this.getDegradation(deg.cpuTime),
            dmlRowsDegraded: this.getDegradation(deg.dmlRows),
            dmlStatementsDegraded: this.getDegradation(deg.dmlStatements),
            heapSizeDegraded: this.getDegradation(deg.heapSize),
            queryRowsDegraded: this.getDegradation(deg.queryRows),
            soqlQueriesDegraded: this.getDegradation(deg.soqlQueries),
          })
        );
      }
      return alerts;
    }, []);

    await this.alerts.save(records);
  }

  private getDegradation({ overThreshold, overAvg }: Degradation): number {
    // at least one overThreshold is non zero for metric to exist
    // use overThreshold as fall back if avg unusable
    return overThreshold > 0 ? overAvg || overThreshold : 0;
  }

  private ensureJson(maybeJson: unknown): string | undefined {
    if (maybeJson != null) {
      return typeof maybeJson == 'string'
        ? maybeJson
        : JSON.stringify(maybeJson);
    }
    return undefined;
  }
}
