/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */
import * as dotenv from 'dotenv';
import fs from 'fs';
import { RangeCollection } from '../services/ranges';
dotenv.config({ path: '.env' });

import { DEFAULT_RANGES } from '../services/defaultRanges';

let cachedRanges: RangeCollection | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || '';
}

export function isDebug() {
  return process.env.NODE_ENV === 'debug';
}

export function shouldStoreAlerts() {
  return process.env.STORE_ALERTS === 'true';
}

export function getUnmanagePackages() {
  return process.env.UNMANAGE_PACKAGE?.split(',') || [];
}

export function getAsyncMonitorTimeout() {
  return process.env.ASYNC_MONITOR_TIMEOUT || '60';
}

export function getExternalBuildId() {
  return process.env.EXTERNAL_BUILD_ID || '';
}

export function clearCache() {
  cachedRanges = null;
}

/**
 * Load the range collection from either a custom JSON path or default json file.
 */
export function getRangeCollection(): RangeCollection {
  if (cachedRanges) {
    return cachedRanges;
  }
  const customRangesPath = process.env.CUSTOM_RANGES_PATH;

  try {
    if (customRangesPath) {
      cachedRanges = JSON.parse(
        fs.readFileSync(customRangesPath, 'utf8')
      ) as RangeCollection;
      return cachedRanges;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }

  cachedRanges = DEFAULT_RANGES;
  return cachedRanges;
}
