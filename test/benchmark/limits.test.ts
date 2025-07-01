/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import * as exec from '../../src/salesforce/execute';
import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
} from '../../src/benchmark/anon';
import {
  GovernorLimits,
  LimitsContext,
} from '../../src/benchmark/limits/schemas';
import { ErrorResult } from '../../src/benchmark/base';
import { MockRunContext } from '../mocks';
import { LimitsBenchmarkOptions } from '../../src/benchmark/limits';
import { ApexScriptParser } from '../../src/parser/apex';
import { LimitsBenchmarkFactory } from '../../src/benchmark/limits/factory';
import { ApexScriptError } from '../../src/parser/apex/error';

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

const parser = new ApexScriptParser();
const factory = new LimitsBenchmarkFactory();

function createBenchmark(
  code: string,
  options: LimitsBenchmarkOptions = {}
): AnonApexBenchmark<GovernorLimits, LimitsContext> {
  const script = parser.parse(code);
  if (script instanceof ApexScriptError) {
    throw script;
  }
  return factory.create(script, options);
}

describe('benchmark/limits', () => {
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
    const bench = createBenchmark('for (Integer i=0; i<10000; i++) {}', {
      id: {
        name: 'for',
        action: 'loop 10k',
      },
    });

    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.include('GovernorLimits');
    expect(finalCode).to.include('void start()');
    expect(finalCode).to.include('start();');
    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'for',
        action: 'loop 10k',
        data: mockResponse,
        context: undefined,
      } as AnonApexBenchmarkResult<GovernorLimits, LimitsContext>,
    ]);
  });

  it('should run legacy benchmark apex code', async () => {
    const code = `
      GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
      for (Integer i=0; i<10000; i++) {}
      GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();
      GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);
      System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');`;
    const bench = createBenchmark(code, {
      id: {
        name: 'for',
        action: 'loop 10k',
      },
    });

    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.include('class GovernorLimits');
    expect(finalCode).to.include(code);
    expect(finalCode).not.to.include('void start()');
    expect(finalCode).not.to.include('start();');
    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'for',
        action: 'loop 10k',
        data: mockResponse,
        context: undefined,
      } as AnonApexBenchmarkResult<GovernorLimits, LimitsContext>,
    ]);
  });

  it('should run single benchmark on scaffolded apex code', async () => {
    const bench = createBenchmark(
      'start(); for (Integer i=0; i<10000; i++) {} stop();',
      {
        id: {
          name: 'for',
          action: 'loop 10k',
        },
      }
    );

    await bench.run();

    expect(execStub).to.be.calledOnce;
    const finalCode = execStub.firstCall.args[1];
    expect(finalCode).to.not.include('start();\nstart();');
    expect(finalCode).to.not.include('stop();\nstop();');
    expect(bench.errors()).to.be.empty;
  });

  it('should be repeatable', async () => {
    const bench = createBenchmark('for (Integer i=0; i<10000; i++) {}', {
      id: {
        name: 'for',
        action: 'loop 10k',
      },
    });

    await bench.run();
    await bench.run();
    await bench.run();

    expect(execStub).to.be.calledThrice;
    expect(bench.errors()).to.be.empty;
    expect(bench.results().length).to.eql(1);
  });

  it('should catch and save error results', async () => {
    const error = new exec.ExecuteAnonymousError('Apex Exception');
    extractStub.throws(error);

    const bench = createBenchmark('for (Integer i=0; i<10000; i++) {}', {
      id: {
        name: 'for',
        action: 'loop 10k',
      },
    });

    await bench.run();

    expect(bench.errors()).to.eql([
      {
        benchmark: {
          name: 'for',
          action: 'loop 10k',
        },
        error,
      } as ErrorResult,
    ]);
  });
});
