/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { ApexBenchmarkService } from '../src/service/apex';
import { restore } from './helper';

// Temporary system test for benchmark service
// Bypasses public APIs

describe('service/apex', () => {
  let apex: ApexBenchmarkService;

  before(async () => {
    restore();
    apex = new ApexBenchmarkService();
    await apex.setup({
      global: {
        projectId: 'MockProduct',
      },
    });
  });

  it('should execute legacy apex script', async () => {
    const result = await apex.benchmarkFile(__dirname + '/scripts/basic.apex');

    expect(result.error).to.be.undefined;
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('basic');
    expect(benchmark.action.name).to.eql('1');
    expect(benchmark.data.cpuTime).to.be.above(0);
    expect(benchmark.data.heapSize).to.be.above(0);
  });

  it('should execute simple apex script', async () => {
    const result = await apex.benchmarkFile(__dirname + '/scripts/simple.apex');

    expect(result.error).to.be.undefined;
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('simple');
    expect(benchmark.action.name).to.eql('1');
    expect(benchmark.data.cpuTime).to.be.above(0);
    expect(benchmark.data.heapSize).to.be.above(0);
  });
});
