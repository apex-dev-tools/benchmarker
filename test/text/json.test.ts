/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { deserialize } from '../../src/text/json';
import { BenchmarkResponse, GovernorLimits } from '../../src/benchmark/schemas';

describe('text/json', () => {
  it('should parse a benchmark', () => {
    const str =
      '{ "name": "bench", "action": "action", "initialLimits": {}, "limits": { "timer": 0, "cpuTime": 0, "dmlRows": 0, "dmlStatements": 0, "heapSize": 0, "queryRows": 0, "soqlQueries": 0, "queueableJobs": 0, "futureCalls": 0 } }';

    expect(deserialize('benchmark', str)).to.eql({
      name: 'bench',
      action: 'action',
      initialLimits: {},
      limits: {
        timer: 0,
        cpuTime: 0,
        dmlRows: 0,
        dmlStatements: 0,
        heapSize: 0,
        queryRows: 0,
        soqlQueries: 0,
        queueableJobs: 0,
        futureCalls: 0,
      },
    } as BenchmarkResponse);
  });

  it('should parse governor limits', () => {
    const str =
      '{ "timer": 0, "cpuTime": 0, "dmlRows": 0, "dmlStatements": 0, "heapSize": 0, "queryRows": 0, "soqlQueries": 0, "queueableJobs": 0, "futureCalls": 0 }';

    expect(deserialize('limits', str)).to.eql({
      timer: 0,
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
    expect(() => deserialize('benchmark', 'error message')).to.throw(
      Error,
      'unexpected token e'
    );
  });

  it('should report json validation errors', () => {
    expect(() => deserialize('limits', '{}')).to.throw(
      Error,
      'missing required properties'
    );
  });
});
