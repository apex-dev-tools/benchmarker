/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { parseType } from '../../src/parser/json.js';
import {
  GovernorLimits,
  limitsSchema,
} from '../../src/benchmark/limits/schemas.js';

describe('text/json', () => {
  it('should parse governor limits', () => {
    const str =
      '{ "duration": 0, "cpuTime": 0, "dmlRows": 0, "dmlStatements": 0, "heapSize": 0, "queryRows": 0, "soqlQueries": 0, "queueableJobs": 0, "futureCalls": 0 }';

    expect(parseType(str, limitsSchema)).to.eql({
      duration: 0,
      cpuTime: 0,
      dmlRows: 0,
      dmlStatements: 0,
      heapSize: 0,
      queryRows: 0,
      soqlQueries: 0,
      queueableJobs: 0,
      futureCalls: 0,
    } as GovernorLimits);
  });

  it('should report json parse errors', () => {
    expect(() => parseType('error message', limitsSchema)).to.throw(
      Error,
      'unexpected token e'
    );
  });

  it('should report json validation errors', () => {
    expect(() => parseType('{}', limitsSchema)).to.throw(
      Error,
      'missing required properties'
    );
  });
});
