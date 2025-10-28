/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { UiTestResult } from './entity/uiTestResult';
import { saveRecords } from './saveRecords';
import { getConnection } from './connection';
import { MoreThanOrEqual } from 'typeorm';
import { generateValidAlerts } from '../services/result/uiAlert';
import { saveAlerts } from './uiAlertInfo';

/**
 * Describes the Thresholds for different limits
 * Use this class to specify thresholds such as: componentLoadTimeThresholdNormal and componentLoadTimeThresholdCritical.
 */
export class UiAlertThresholds {
  componentLoadTimeThresholdNormal: number;
  componentLoadTimeThresholdCritical: number;
}

export class UiAlertInfo {
  /**
   * Describes whether alerts need to be stored or not at the test level
   */
  public storeAlerts: boolean;

  /**
   * Defines custom thresholds at the test level. When specified, these values take precedence over defaults and those set in the environment file.
   */
  public uiAlertThresholds: UiAlertThresholds;
}

/**
 * Data Transfer Object for UI Test Results
 */
export interface UiTestResultDTO {
  testSuiteName: string;
  individualTestName: string;
  componentLoadTime?: number;
  salesforceLoadTime?: number;
  overallLoadTime: number;
  alertInfo?: UiAlertInfo;
}

/**
 * Filter options for loading UI Test Results
 */
export interface UiTestResultFilterOptions {
  testSuiteName?: string;
  individualTestName?: string;
}

/**
 * Converts a DTO to a database entity
 */
function dtoToEntity(dto: UiTestResultDTO): UiTestResult {
  const entity = new UiTestResult();

  entity.testSuiteName = dto.testSuiteName;
  entity.individualTestName = dto.individualTestName;
  entity.componentLoadTime = dto.componentLoadTime || 0;
  entity.salesforceLoadTime = dto.salesforceLoadTime || 0;
  entity.overallLoadTime = dto.overallLoadTime;

  return entity;
}

/**
 * Converts a database entity to a DTO
 */
function entityToDto(entity: UiTestResult): UiTestResultDTO {
  return {
    testSuiteName: entity.testSuiteName,
    individualTestName: entity.individualTestName,
    componentLoadTime: entity.componentLoadTime,
    salesforceLoadTime: entity.salesforceLoadTime,
    overallLoadTime: entity.overallLoadTime,
  };
}

export async function saveUiTestResult(
  testStepResults: UiTestResultDTO[]
): Promise<UiTestResultDTO[]> {
  const entities = testStepResults.map(dtoToEntity);
  const savedEntities = await saveRecords<UiTestResult>(entities);
  const alerts = await generateValidAlerts(testStepResults);
  if (alerts.length) {
    await saveAlerts(savedEntities, alerts);
  }
  return savedEntities.map(entityToDto);
}

/*
 * Load UI Test Results from the last 30 days.
 */
export async function loadUiTestResults(
  filterOptions?: UiTestResultFilterOptions
): Promise<UiTestResultDTO[]> {
  const connection = await getConnection();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const whereClause: Partial<UiTestResult> = {};

  if (filterOptions) {
    if (filterOptions.testSuiteName !== undefined) {
      whereClause.testSuiteName = filterOptions.testSuiteName;
    }
    if (filterOptions.individualTestName !== undefined) {
      whereClause.individualTestName = filterOptions.individualTestName;
    }
  }

  const entities = await connection.manager.find(UiTestResult, {
    where: [
      {
        ...whereClause,
        createDateTime: MoreThanOrEqual(thirtyDaysAgo),
      },
    ],
    order: {
      createDateTime: 'DESC',
    },
  });

  return entities.map(entityToDto);
}
