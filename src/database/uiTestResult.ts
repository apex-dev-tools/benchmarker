/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { UiTestResult } from './entity/uiTestResult';
import { saveRecords } from './saveRecords';
import { getConnection } from './connection';

/**
 * Data Transfer Object for UI Test Results
 */
export interface UiTestResultDTO {
  testSuiteName: string;
  individualTestName: string;
  componentLoadTime?: number;
  salesforceLoadTime?: number;
  overallLoadTime: number;
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
  return savedEntities.map(entityToDto);
}

export async function loadUiTestResults(
  filterOptions?: UiTestResultFilterOptions
): Promise<UiTestResultDTO[]> {
  const connection = await getConnection();

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
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
  });

  return entities.map(entityToDto);
}
