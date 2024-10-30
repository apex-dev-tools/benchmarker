/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import Ajv, { JTDSchemaType, ValidateFunction } from 'ajv/dist/jtd';

export interface BenchmarkLimits {
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

export interface BenchmarkState {
  name: string | null;
  action: string | null;
  limits: BenchmarkLimits | null;
}

const ajv = new Ajv();

const limitsSchema: JTDSchemaType<BenchmarkLimits> = {
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
};

const benchmarkStateSchema: JTDSchemaType<BenchmarkState> = {
  properties: {
    name: { type: 'string', nullable: true },
    action: { type: 'string', nullable: true },
    limits: { ...limitsSchema, nullable: true },
  },
  additionalProperties: true,
};

const schemas = {
  limits: limitsSchema,
  benchmark: benchmarkStateSchema,
};
const validators = {};

type SchemaKey = keyof typeof schemas;

type ValidType<S extends SchemaKey> =
  (typeof schemas)[S] extends JTDSchemaType<infer T> ? T : never;

type ValidatorMap<S extends SchemaKey> = Record<
  SchemaKey,
  ValidateFunction<ValidType<S>>
>;

export function validate<S extends SchemaKey>(
  key: S,
  data: unknown
): ValidType<S> | undefined {
  let validator = (validators as ValidatorMap<S>)[key];

  if (!validator) {
    validator = ajv.compile<ValidType<S>>(schemas[key]);
    (validators as ValidatorMap<S>)[key] = validator;
  }

  if (validator(data)) {
    return data;
  }

  return undefined;
}
