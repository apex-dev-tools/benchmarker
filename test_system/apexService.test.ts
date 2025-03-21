/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { SalesforceConnection } from '../src/';
import {
  connectToSalesforceOrg,
  getSalesforceAuthInfoFromEnvVars,
} from '../src/services/salesforce/connection';
import { ApexBenchmarkService } from '../src/service/apex';

// Temporary system test for benchmark service
// Bypasses public APIs

describe('services/apex', () => {
  let connection: SalesforceConnection;

  before(async () => {
    connection = await connectToSalesforceOrg(
      getSalesforceAuthInfoFromEnvVars()
    );
  });

  it('should execute legacy apex script', async () => {
    const apex = new ApexBenchmarkService(connection);

    const result = await apex.benchmark(__dirname + '/scripts/basic.apex');

    expect(result.errors.length).to.eql(0);
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('basic');
    expect(benchmark.action).to.eql('1');
    expect(benchmark.limits.cpuTime).to.be.above(0);
    expect(benchmark.limits.heapSize).to.be.above(0);
  });

  it('should execute simple apex script', async () => {
    const apex = new ApexBenchmarkService(connection);

    const result = await apex.benchmark(__dirname + '/scripts/simple.apex');

    expect(result.errors.length).to.eql(0);
    expect(result.benchmarks.length).to.eql(1);
    const benchmark = result.benchmarks[0];
    expect(benchmark.name).to.eql('simple');
    expect(benchmark.action).to.eql('1');
    expect(benchmark.limits.cpuTime).to.be.above(0);
    expect(benchmark.limits.heapSize).to.be.above(0);
  });
});
