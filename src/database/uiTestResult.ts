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
  id?: number;
  testSuiteName?: string;
  individualTestName?: string;
  componentLoadTime?: number;
  salesforceLoadTime?: number;
  overallLoadTime?: number;
}

/**
 * Converts a DTO to a database entity
 */
function dtoToEntity(dto: UiTestResultDTO): UiTestResult {
  const entity = new UiTestResult();
  if (dto.id !== undefined) {
    entity.id = dto.id;
  }
  if (dto.testSuiteName !== undefined) {
    entity.testSuiteName = dto.testSuiteName;
  }
  if (dto.individualTestName !== undefined) {
    entity.individualTestName = dto.individualTestName;
  }
  if (dto.componentLoadTime !== undefined) {
    entity.componentLoadTime = dto.componentLoadTime;
  }
  if (dto.salesforceLoadTime !== undefined) {
    entity.salesforceLoadTime = dto.salesforceLoadTime;
  }
  if (dto.overallLoadTime !== undefined) {
    entity.overallLoadTime = dto.overallLoadTime;
  }
  return entity;
}

/**
 * Converts a database entity to a DTO
 */
function entityToDto(entity: UiTestResult): UiTestResultDTO {
  return {
    id: entity.id,
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

export async function loadUiTestResults(): Promise<UiTestResultDTO[]> {
  const connection = await getConnection();
  const entities = await connection.manager.find(UiTestResult);
  return entities.map(entityToDto);
}
