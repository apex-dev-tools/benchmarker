/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export enum DebugLogCategory {
  Db = 'Db',
  Workflow = 'Workflow',
  Validation = 'Validation',
  Callout = 'Callout',
  Apex_code = 'Apex_code',
  Apex_profiling = 'Apex_profiling',
  Visualforce = 'Visualforce',
  System = 'System',
  Wave = 'Wave',
  Nba = 'Nba',
  All = 'All',
}

export enum DebugLogCategoryLevel {
  None = 'None',
  Finest = 'Finest',
  Finer = 'Finer',
  Fine = 'Fine',
  Debug = 'Debug',
  Info = 'Info',
  Warn = 'Warn',
  Error = 'Error',
}

export interface DebugLogInfo {
  category: DebugLogCategory;
  level: DebugLogCategoryLevel;
}

export function apexDebugHeader(debugTraces?: DebugLogInfo[]): string {
  if (debugTraces && debugTraces.length > 0) {
    const categories = debugTraces.reduce(
      (acc, curr) => acc + apexLogInfo(curr),
      ''
    );
    return `<DebuggingHeader>${categories}</DebuggingHeader>`;
  } else {
    return '';
  }
}

function apexLogInfo(info: DebugLogInfo): string {
  const category = `<category>${info.category}</category>`;
  const level = `<level>${info.level}</level>`;
  return `<categories>${category}${level}</categories>`;
}
