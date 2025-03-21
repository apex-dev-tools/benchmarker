/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import Ajv, { JTDSchemaType, ValidateFunction } from 'ajv/dist/jtd';
import { limitsSchema, benchmarkSchema } from '../benchmark/schemas';

const ajv = new Ajv();

const schemas = {
  limits: limitsSchema,
  benchmark: benchmarkSchema,
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
