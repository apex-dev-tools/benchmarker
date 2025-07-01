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
      __dirname + '/scripts/basic.apex',
      {
        id: {
          name: 'basic',
          action: '1',
        },
      }
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
      __dirname + '/scripts/simple.apex',
      {
        id: {
          name: 'simple',
          action: '1',
        },
      }
    );

    expect(result.errors).to.be.empty;
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('simple');
    expect(benchmark.action).to.eql('1');
    expect(benchmark.data.cpuTime).to.be.above(0);
    expect(benchmark.data.heapSize).to.be.above(0);
  });

  it('should execute wrapped apex script', async () => {
    const result = await apex.benchmarkFileLimits(
      __dirname + '/scripts/wrapped.apex',
      {
        id: {
          name: 'wrapped',
          action: '1',
        },
      }
    );

    expect(result.errors).to.be.empty;
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('wrapped');
    expect(benchmark.action).to.eql('1');
    expect(benchmark.data.cpuTime).to.be.above(0);
    expect(benchmark.data.heapSize).to.be.above(0);
  });

  it('should execute full apex script', async () => {
    const result = await apex.benchmarkFileLimits(
      __dirname + '/scripts/full.apex'
    );

    expect(result.errors).to.be.empty;
    expect(result.benchmarks.length).to.eql(2);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('full');
    expect(benchmark.action).to.eql('action 1');
    expect(benchmark.data.cpuTime).to.be.above(0);
    expect(benchmark.data.heapSize).to.be.above(0);
    const benchmark2 = result.benchmarks[1];
    expect(benchmark2.name).to.eql('full');
    expect(benchmark2.action).to.eql('action 2');
    expect(benchmark2.data.cpuTime).to.be.above(0);
    expect(benchmark2.data.heapSize).to.be.above(0);
  });
});
