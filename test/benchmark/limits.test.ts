/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { HttpRequest } from '@jsforce/jsforce-node';
import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import sinon, { type SinonStub } from 'sinon';
import type {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
} from '../../src/benchmark/anon.js';
import type { ErrorResult } from '../../src/benchmark/base.js';
import type { LimitsBenchmarkOptions } from '../../src/benchmark/limits.js';
import { LimitsBenchmarkFactory } from '../../src/benchmark/limits/factory.js';
import type {
  GovernorLimits,
  LimitsContext,
} from '../../src/benchmark/limits/schemas.js';
import { ApexScriptParser } from '../../src/parser/apex.js';
import { ApexScriptError } from '../../src/parser/apex/error.js';
import { escapeXml } from '../../src/parser/xml.js';
import { ExecuteAnonymousError } from '../../src/salesforce/execute.js';
import { execAnonDataResponse, execAnonErrorResponse } from '../helpers.js';
import { mockLimits, MockRunContext } from '../mocks.js';

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
  const $$ = new TestContext({ sinon });
  let requestStub: SinonStub;

  beforeEach(async () => {
    const ctx = MockRunContext.createMock(sinon);
    ctx.stubSfOrg(await ctx.stubSfConnection());

    requestStub = sinon.stub();
    $$.fakeConnectionRequest = requestStub;
    requestStub.resolves(execAnonDataResponse(mockLimits));
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

    expect(requestStub).to.be.calledOnce;
    const req = requestStub.firstCall.args[0] as HttpRequest;
    expect(req.body).to.include('GovernorLimits');
    expect(req.body).to.include('void start()');
    expect(req.body).to.include('start();');
    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'for',
        action: 'loop 10k',
        data: mockLimits,
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

    expect(requestStub).to.be.calledOnce;
    const req = requestStub.firstCall.args[0] as HttpRequest;
    expect(req.body).to.include('class GovernorLimits');
    expect(req.body).to.include(escapeXml(code));
    expect(req.body).not.to.include('void start()');
    expect(req.body).not.to.include('start();');
    expect(bench.errors()).to.be.empty;
    expect(bench.results()).to.eql([
      {
        name: 'for',
        action: 'loop 10k',
        data: mockLimits,
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

    expect(requestStub).to.be.calledOnce;
    const req = requestStub.firstCall.args[0] as HttpRequest;
    expect(req.body).to.not.include('start();\nstart();');
    expect(req.body).to.not.include('stop();\nstop();');
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

    expect(requestStub).to.be.calledThrice;
    expect(bench.errors()).to.be.empty;
    expect(bench.results().length).to.eql(1);
  });

  it('should catch and save error results', async () => {
    const error = new ExecuteAnonymousError('System.FooException: ...');
    requestStub.resolves(execAnonErrorResponse('System.FooException: ...'));

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
