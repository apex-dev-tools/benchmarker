/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import * as soap from '../../src/soap/executeAnonymous';
import { GovernorLimits } from '../../src/benchmark/schemas';
import { LegacyAnonApexBenchmark } from '../../src/benchmark/legacy';
import { Connection } from '@salesforce/core';
import { AnonApexBenchmarkResult } from '../../src/benchmark/anonApex';
import { ErrorResult } from '../../src/benchmark/base';

const mockLimits: GovernorLimits = {
  cpuTime: 9,
  dmlRows: 0,
  dmlStatements: 0,
  futureCalls: 0,
  heapSize: 40131,
  queryRows: 0,
  queueableJobs: 0,
  soqlQueries: 0,
  timer: 8,
};

describe('benchmark/legacy', () => {
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
          `System.AssertException: Assertion Failed: -_${JSON.stringify(mockLimits)}_-`
        )
      );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should run single benchmark transaction on legacy code', async () => {
    const bench = new LegacyAnonApexBenchmark('apexfile', {
      code: '~limitsDiff + assert~',
      connection: {} as Connection,
    });

    await bench.prepare();
    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.include('class GovernorLimits');
    expect(finalCode).to.not.include('class Benchmark');
    expect(finalCode).to.not.include('benchmark.start();');
    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'apexfile',
        action: '1',
        limits: mockLimits,
      } as AnonApexBenchmarkResult,
    ]);
  });

  it('should catch and save error results', async () => {
    const error = new soap.ExecuteAnonymousError('Apex Exception');
    errorStub.returns(error);

    const bench = new LegacyAnonApexBenchmark('apexfile', {
      code: '~limitsDiff + assert~',
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
