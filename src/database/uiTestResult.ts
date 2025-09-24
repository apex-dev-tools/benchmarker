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
  id: number;
  testSuiteName: string;
  individualTestName: string;
  componentLoadTime?: number;
  salesforceLoadTime?: number;
  overallLoadTime: number;
}

/**
 * Converts a DTO to a database entity
 */
function dtoToEntity(dto: UiTestResultDTO): UiTestResult {
  const entity = new UiTestResult();

  entity.id = dto.id;
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
  return { ...entity };
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
