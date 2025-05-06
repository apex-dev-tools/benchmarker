/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import * as exec from '../../../src/salesforce/execute';
import { AnonApexBenchmarkResult } from '../../../src/benchmark/apex/anon';
import {
  GovernorLimits,
  LimitsContext,
} from '../../../src/benchmark/apex/schemas';
import { ErrorResult } from '../../../src/benchmark/base';
import { MockRunContext } from '../../mocks';
import { LimitsAnonApexBenchmark } from '../../../src/benchmark/apex/limits';

const mockResponse: GovernorLimits = {
  duration: 8,
  cpuTime: 9,
  dmlRows: 0,
  dmlStatements: 0,
  heapSize: 40131,
  queryRows: 0,
  soqlQueries: 0,
  queueableJobs: 0,
  futureCalls: 0,
};

describe('benchmark/apex/limits', () => {
  let execStub: SinonStub;
  let extractStub: SinonStub;

  beforeEach(() => {
    MockRunContext.createMock(sinon).stubOrg();

    execStub = sinon.stub(exec, 'executeAnonymous').resolves({
      column: '-1',
      compiled: true,
      compileProblem: '',
      exceptionMessage: '',
      exceptionStackTrace: '',
      line: '-1',
      success: false,
    });
    extractStub = sinon
      .stub(exec, 'extractAssertionData')
      .returns(mockResponse);
  });

  afterEach(() => {
    sinon.restore();
    MockRunContext.reset();
  });

  it('should run single benchmark transaction on simple apex code', async () => {
    const bench = new LimitsAnonApexBenchmark({
      name: 'apexfile',
      code: 'for (Integer i=0; i<10000; i++) {}',
    });

    await bench.prepare();
    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.include('class Benchmark');
    expect(finalCode).to.include('benchmark.start();');
    expect(bench.error()).to.be.undefined;
    expect(bench.results()).to.eql([
      {
        name: 'apexfile',
        action: { name: '1' },
        data: mockResponse,
      } as AnonApexBenchmarkResult<GovernorLimits, LimitsContext>,
    ]);
  });

  it('should run single benchmark on scaffolded apex code', async () => {
    const bench = new LimitsAnonApexBenchmark({
      name: 'apexfile',
      code: 'benchmark.start(); for (Integer i=0; i<10000; i++) {} benchmark.stop();',
    });

    await bench.prepare();
    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.not.include('benchmark.start();benchmark.start();');
    expect(finalCode).to.not.include('benchmark.stop();benchmark.stop();');
    expect(bench.error()).to.be.undefined;
  });

  it('should be repeatable after a single prepare', async () => {
    const bench = new LimitsAnonApexBenchmark({
      name: 'apexfile',
      code: 'for (Integer i=0; i<10000; i++) {}',
    });

    await bench.prepare();

    await bench.run();
    await bench.run();
    await bench.run();

    expect(execStub).to.be.calledThrice;
    expect(bench.error()).to.be.undefined;
    expect(bench.results().length).to.eql(1);
  });

  it('should be able to override actions', async () => {
    const bench = new LimitsAnonApexBenchmark({
      name: 'apexfile',
      code: 'for (Integer i=0; i<10000; i++) {}',
    });

    await bench.prepare([{ name: 'do a loop' }]);
    await bench.run();

    expect(bench.error()).to.be.undefined;
    expect(bench.results()).to.eql([
      {
        name: 'apexfile',
        action: { name: 'do a loop' },
        data: mockResponse,
      } as AnonApexBenchmarkResult<GovernorLimits, LimitsContext>,
    ]);
  });

  it('should catch and save error results', async () => {
    const error = new exec.ExecuteAnonymousError('Apex Exception');
    extractStub.throws(error);

    const bench = new LimitsAnonApexBenchmark({
      name: 'apexfile',
      code: 'for (Integer i=0; i<10000; i++) {}',
    });

    await bench.prepare();
    await bench.run();

    expect(bench.error()).to.eql({
      name: 'apexfile',
      actionName: '1',
      error,
    } as ErrorResult);
  });
});
