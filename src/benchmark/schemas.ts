/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { NamedSchema } from '../text/json';

export interface GovernorLimits {
  timer: number;
  cpuTime: number;
  dmlRows: number;
  dmlStatements: number;
  heapSize: number;
  queryRows: number;
  soqlQueries: number;
  queueableJobs: number;
  futureCalls: number;
}

export interface BenchmarkResponse {
  name: string | null;
  action: string | null;
  limits: GovernorLimits | null;
}

export const limitsSchema: NamedSchema<GovernorLimits> = {
  name: 'limits',
  schema: {
    properties: {
      timer: { type: 'int32' },
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

export const benchmarkSchema: NamedSchema<BenchmarkResponse> = {
  name: 'benchmark',
  schema: {
    properties: {
      name: { type: 'string', nullable: true },
      action: { type: 'string', nullable: true },
      limits: { ...limitsSchema.schema, nullable: true },
    },
    additionalProperties: true,
  },
};
