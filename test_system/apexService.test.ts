/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { ApexBenchmarkService } from '../src/service/apex';
import { restore } from './helper';

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
    const result = await apex.benchmarkFileLimits(
      __dirname + '/scripts/basic.apex'
    );

    expect(result.errors).to.be.empty;
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('basic');
    expect(benchmark.action).to.eql('1');
    expect(benchmark.data.cpuTime).to.be.above(0);
    expect(benchmark.data.heapSize).to.be.above(0);
  });

  it('should execute simple apex script', async () => {
    const result = await apex.benchmarkFileLimits(
      __dirname + '/scripts/simple.apex'
    );

    expect(result.errors).to.be.empty;
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('simple');
    expect(benchmark.action).to.eql('1');
    expect(benchmark.data.cpuTime).to.be.above(0);
    expect(benchmark.data.heapSize).to.be.above(0);
  });
});
