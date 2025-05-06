/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { LimitsThresholds } from '../../metrics/limits';
import { NamedSchema } from '../../parser/json';

// retrieved from anonymous
export interface GovernorLimits {
  duration: number;
  cpuTime: number;
  dmlRows: number;
  dmlStatements: number;
  heapSize: number;
  queryRows: number;
  soqlQueries: number;
  queueableJobs: number;
  futureCalls: number;
}

export interface LimitsContext {
  enableMetrics?: boolean;
  thresholds?: LimitsThresholds;
}

export const limitsSchema: NamedSchema<GovernorLimits> = {
  name: 'limits',
  schema: {
    properties: {
      duration: { type: 'int32' },
      cpuTime: { type: 'int32' },
      dmlRows: { type: 'int32' },
      dmlStatements: { type: 'int32' },
      heapSize: { type: 'int32' },
      queryRows: { type: 'int32' },
      soqlQueries: { type: 'int32' },
      queueableJobs: { type: 'int32' },
      futureCalls: { type: 'int32' },
    },
  },
};
