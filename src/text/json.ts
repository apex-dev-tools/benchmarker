/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import Ajv, { JTDSchemaType, JTDParser } from 'ajv/dist/jtd';
import { limitsSchema, benchmarkSchema } from '../benchmark/schemas';

const ajv = new Ajv();

const schemas = {
  limits: limitsSchema,
  benchmark: benchmarkSchema,
};

const parsers = {};

type SchemaKey = keyof typeof schemas;

type ParsedType<S extends SchemaKey> =
  (typeof schemas)[S] extends JTDSchemaType<infer T> ? T : never;

type ParserMap<S extends SchemaKey> = Record<
  SchemaKey,
  JTDParser<ParsedType<S>>
>;

export function deserialize<S extends SchemaKey>(
  key: S,
  text: string
): ParsedType<S> {
  let parse = (parsers as ParserMap<S>)[key];

  if (!parse) {
    parse = ajv.compileParser<ParsedType<S>>(schemas[key]);
    (parsers as ParserMap<S>)[key] = parse;
  }

  const data = parse(text);

  if (data) {
    return data;
  } else {
    throw new Error(
      `Failed to parse JSON type "${key}": ${parse.message} (pos: ${parse.position})`
    );
  }
}
