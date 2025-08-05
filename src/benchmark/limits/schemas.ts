/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { LimitsThresholds } from '../../metrics/limits.js';
import type { NamedSchema } from '../../parser/json.js';

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
  data?: any;
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

export const contextSchema: NamedSchema<LimitsContext> = {
  name: 'limitsContext',
  schema: {
    optionalProperties: {
      enableMetrics: { type: 'boolean' },
      thresholds: {
        optionalProperties: limitsSchema.schema.properties,
      },
      data: {},
    },
  },
};
