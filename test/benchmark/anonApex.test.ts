/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import * as soap from '../../src/soap/executeAnonymous';
import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
} from '../../src/benchmark/anonApex';
import { Connection } from '@salesforce/core';
import { BenchmarkResponse } from '../../src/benchmark/schemas';
import { ErrorResult } from '../../src/benchmark/base';

const mockResponse: BenchmarkResponse = {
  name: null,
  action: null,
  limits: {
    cpuTime: 9,
    dmlRows: 0,
    dmlStatements: 0,
    futureCalls: 0,
    heapSize: 40131,
    queryRows: 0,
    queueableJobs: 0,
    soqlQueries: 0,
    timer: 8,
  },
};

describe('benchmark/anonApex', () => {
  let execStub: SinonStub;
  let errorStub: SinonStub;

  beforeEach(() => {
    execStub = sinon.stub(soap, 'executeAnonymous').resolves({
      column: '-1',
      compiled: true,
      compileProblem: '',
      exceptionMessage: '',
      exceptionStackTrace: '',
      line: '-1',
      success: false,
    });
    errorStub = sinon
      .stub(soap, 'assertAnonymousError')
      .returns(
        new soap.ExecuteAnonymousError(
          `System.AssertException: Assertion Failed: -_${JSON.stringify(mockResponse)}_-`
        )
      );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should run single benchmark transaction on simple apex code', async () => {
    const bench = new AnonApexBenchmark('apexfile', {
      code: 'for (Integer i=0; i<10000; i++) {}',
      connection: {} as Connection,
    });

    await bench.prepare();
    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.include('class Benchmark');
    expect(finalCode).to.include('benchmark.start();');
    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'apexfile',
        action: '1',
        limits: mockResponse.limits,
      } as AnonApexBenchmarkResult,
    ]);
  });

  it('should run single benchmark on scaffolded apex code', async () => {
    const bench = new AnonApexBenchmark('apexfile', {
      code: 'benchmark.start(); for (Integer i=0; i<10000; i++) {} benchmark.stop();',
      connection: {} as Connection,
    });

    await bench.prepare();
    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.not.include('benchmark.start();benchmark.start();');
    expect(finalCode).to.not.include('benchmark.stop();benchmark.stop();');
    expect(bench.errors()).to.be.empty;
  });

  it('should be repeatable after a single prepare', async () => {
    const bench = new AnonApexBenchmark('apexfile', {
      code: 'for (Integer i=0; i<10000; i++) {}',
      connection: {} as Connection,
    });

    await bench.prepare();

    await bench.run();
    await bench.run();
    await bench.run();

    expect(execStub).to.be.calledThrice;
    expect(bench.errors()).to.be.empty;
    expect(bench.results().length).to.eql(1);
  });

  it('should be able to override actions', async () => {
    const bench = new AnonApexBenchmark('apexfile', {
      code: 'for (Integer i=0; i<10000; i++) {}',
      connection: {} as Connection,
    });

    await bench.prepare(['do a loop']);
    await bench.run();

    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'apexfile',
        action: 'do a loop',
        limits: mockResponse.limits,
      } as AnonApexBenchmarkResult,
    ]);
  });

  it('should be able to override name and actions from script', async () => {
    errorStub.returns(
      new soap.ExecuteAnonymousError(
        `System.AssertException: Assertion Failed: -_${JSON.stringify({
          ...mockResponse,
          name: 'loop',
          action: 'do a loop',
        })}_-`
      )
    );

    const bench = new AnonApexBenchmark('apexfile', {
      code: "benchmark.setName('loop'); benchmark.start('do a loop'); for (Integer i=0; i<10000; i++) {}",
      connection: {} as Connection,
    });

    await bench.prepare();
    await bench.run();

    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'loop',
        action: 'do a loop',
        limits: mockResponse.limits,
      } as AnonApexBenchmarkResult,
    ]);
  });

  it('should catch and save error results', async () => {
    const error = new soap.ExecuteAnonymousError('Apex Exception');
    errorStub.returns(error);

    const bench = new AnonApexBenchmark('apexfile', {
      code: 'for (Integer i=0; i<10000; i++) {}',
      connection: {} as Connection,
    });

    await bench.prepare();
    await bench.run();

    expect(bench.errors()).to.eql([
      {
        name: 'apexfile',
        action: '1',
        error,
      } as ErrorResult,
    ]);
  });
});
