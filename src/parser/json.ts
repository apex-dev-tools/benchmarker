/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { Ajv, type JTDParser, type JTDSchemaType } from "ajv/dist/jtd.js";

const ajv = new Ajv();

const parsers: {
  [key: string]: JTDParser;
} = {};

export interface NamedSchema<T> {
  name: string;
  schema: JTDSchemaType<T>;
}

export function parseType<T>(text: string, schema: NamedSchema<T>): T {
  let parse = parsers[schema.name] as JTDParser<T>;

  if (!parse) {
    parse = ajv.compileParser<T>(schema.schema);
    parsers[schema.name] = parse;
  }

  const data = parse(text);

  if (data) {
    return data;
  } else {
    throw new Error(
      `Failed to parse JSON type "${schema.name}", ${parse.message} (position: ${parse.position})`
    );
  }
}
