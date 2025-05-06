/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import * as exec from '../../../src/salesforce/execute';
import {
  GovernorLimits,
  LimitsContext,
} from '../../../src/benchmark/apex/schemas';
import { LegacyAnonApexBenchmark } from '../../../src/benchmark/apex/legacy';
import { AnonApexBenchmarkResult } from '../../../src/benchmark/apex/anon';
import { ErrorResult } from '../../../src/benchmark/base';
import { MockRunContext } from '../../mocks';

const mockLimits: GovernorLimits = {
  duration: 8,
  cpuTime: 9,
  dmlRows: 0,
  dmlStatements: 0,
  futureCalls: 0,
  heapSize: 40131,
  queryRows: 0,
  queueableJobs: 0,
  soqlQueries: 0,
};

describe('benchmark/apex/legacy', () => {
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
    extractStub = sinon.stub(exec, 'extractAssertionData').returns(mockLimits);
  });

  afterEach(() => {
    sinon.restore();
    MockRunContext.reset();
  });

  it('should run single benchmark transaction on legacy code', async () => {
    const bench = new LegacyAnonApexBenchmark({
      name: 'apexfile',
      code: '~limitsDiff + assert~',
    });

    await bench.prepare();
    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.include('class GovernorLimits');
    expect(finalCode).to.not.include('class Benchmark');
    expect(finalCode).to.not.include('benchmark.start();');
    expect(bench.error()).to.be.undefined;
    expect(bench.results()).to.eql([
      {
        name: 'apexfile',
        action: { name: '1' },
        data: mockLimits,
      } as AnonApexBenchmarkResult<GovernorLimits, LimitsContext>,
    ]);
  });

  it('should catch and save error results', async () => {
    const error = new exec.ExecuteAnonymousError('Apex Exception');
    extractStub.throws(error);

    const bench = new LegacyAnonApexBenchmark({
      name: 'apexfile',
      code: '~limitsDiff + assert~',
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
