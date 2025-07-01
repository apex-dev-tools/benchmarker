/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub, SinonStubbedInstance } from 'sinon';
import mockfs from 'mock-fs';
import * as limits from '../../src/benchmark/limits';
import * as legacy from '../../src/benchmark/limits/legacy';
import {
  ApexBenchmarkService,
  LimitsBenchmarkResult,
} from '../../src/service/apex';

import {
  GovernorLimits,
  LimitsContext,
} from '../../src/benchmark/limits/schemas';
import { MockRunContext } from '../mocks';
import { BenchmarkOrg } from '../../src/salesforce/org';
import { PostgresDataSource } from '../../src/database/postgres';
import { AnonApexBenchmark } from '../../src/benchmark/anon';
import { LimitsScriptFormat } from '../../src/benchmark/limits/factory';

const legacyContent = `
GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
Integer i = 0;
GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();
GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);
System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
`;

function apexContent(id: number): string {
  return `
  benchmark('script${id}');

  describe('${id}');

  start();
  Integer i = 0;
  stop();
  `;
}

function apexFormat(id: number): LimitsScriptFormat {
  return {
    name: `script${id}`,
    headerEndIndex: 0,
    actions: [
      {
        name: `${id}`,
        blockBeginIndex: 1,
        blockEndIndex: undefined,
        needsEnding: true,
      },
    ],
  };
}

const apexCode = [1, 2, 3].map(i => apexContent(i));

describe('service/apex', () => {
  let anonStub: SinonStub;
  let anonStubInstance: SinonStubbedInstance<
    AnonApexBenchmark<GovernorLimits, LimitsContext>
  >;
  let legacyStub: SinonStub;
  let legacyStubInstance: SinonStubbedInstance<
    AnonApexBenchmark<GovernorLimits, LimitsContext>
  >;
  let orgStub: SinonStubbedInstance<BenchmarkOrg>;
  let pgStub: SinonStubbedInstance<PostgresDataSource>;
  let service: ApexBenchmarkService;

  beforeEach(() => {
    const mockRun = MockRunContext.createMock(sinon);
    mockRun.stubGlobals();
    orgStub = mockRun.stubOrg();
    pgStub = mockRun.stubPg(true);

    anonStubInstance = sinon.createStubInstance(limits.LimitsAnonApexBenchmark);
    legacyStubInstance = sinon.createStubInstance(
      legacy.LegacyAnonApexBenchmark
    );
    anonStub = sinon
      .stub(limits, 'LimitsAnonApexBenchmark')
      .returns(anonStubInstance);
    legacyStub = sinon
      .stub(legacy, 'LegacyAnonApexBenchmark')
      .returns(legacyStubInstance);

    anonStubInstance.results.returns([]);
    anonStubInstance.errors.returns([]);
    anonStubInstance.run.resolves();
    legacyStubInstance.results.returns([]);
    legacyStubInstance.errors.returns([]);
    legacyStubInstance.run.resolves();

    mockfs({
      'test/scripts/': {
        'script1.apex': apexCode[0],
        'script2.apex': apexCode[1],
        'other.ts': 'script should not run',
      },
      'test/scripts/nested/dir/script3.apex': apexCode[2],
      'legacy/test/scripts/script4.apex': legacyContent,
      'force-app/main/default/classes/': {
        'ApexClass.cls': 'apex class code',
        'ApexClass.cls-meta.xml': 'xml',
      },
      'readme.md': 'markdown text',
    });

    service = new ApexBenchmarkService();
  });

  afterEach(() => {
    sinon.restore();
    mockfs.restore();
    MockRunContext.reset();
  });

  it('should run a benchmark for a specific apex file', async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: 'script1',
        action: '1',
        data: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const res = await service.benchmarkFileLimits('test/scripts/script1.apex');

    expect(res.errors).to.be.empty;
    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(anonStub).to.be.calledOnceWith(sinon.match.any, apexFormat(1));
    expect(anonStubInstance.run.calledOnce).to.be.true;
    expect(res.benchmarks).to.eql(results);
  });

  it('should run benchmarks on a script directory', async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: 'script1',
        action: '1',
        data: {} as GovernorLimits,
      },
      {
        name: 'script2',
        action: '2',
        data: {} as GovernorLimits,
      },
      {
        name: 'script3',
        action: '3',
        data: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns([results[0]]);
    anonStubInstance.results.onSecondCall().returns([results[1]]);
    anonStubInstance.results.onThirdCall().returns([results[2]]);

    const res = await service.benchmarkLimits({ paths: ['test/scripts'] });

    expect(res.errors).to.be.empty;
    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(anonStub).to.be.calledThrice;
    expect(anonStub).to.be.calledWith(sinon.match.any, apexFormat(1));
    expect(anonStub).to.be.calledWith(sinon.match.any, apexFormat(2));
    expect(anonStub).to.be.calledWith(sinon.match.any, apexFormat(3));
    expect(anonStubInstance.run.calledThrice).to.be.true;
    expect(res.benchmarks).to.eql(results);
  });

  it('should run a benchmark for an apex string', async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: 'script1',
        action: '1',
        data: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const res = await service.benchmarkLimits({
      code: `
      start();
      Integer i = 0;
      stop();
      `,
      options: {
        id: {
          name: 'script1',
          action: '1',
        },
      },
    });

    expect(res.errors).to.be.empty;
    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(anonStub).to.be.calledOnceWith(sinon.match.any, {
      name: 'script1',
      actions: [
        {
          name: '1',
          needsWrapping: false,
          needsEnding: true,
          context: undefined,
        },
      ],
    });
    expect(anonStubInstance.run.calledOnce).to.be.true;
    expect(res.benchmarks).to.eql(results);
  });

  it('should support legacy apex content', async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: 'script4',
        action: '4',
        data: {} as GovernorLimits,
      },
    ];
    legacyStubInstance.results.onFirstCall().returns(results);

    const res = await service.benchmarkLimits({
      paths: ['legacy/test/scripts/script4.apex'],
      options: {
        id: {
          name: 'script4',
          action: '4',
        },
      },
    });

    expect(res.errors).to.be.empty;
    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(legacyStub).to.be.calledOnceWith(sinon.match.any, {
      name: 'script4',
      actions: [
        {
          name: '4',
          context: undefined,
        },
      ],
    });
    expect(legacyStubInstance.run.calledOnce).to.be.true;
    expect(res.benchmarks).to.eql(results);
  });

  it('should return error if specific file is not apex', async () => {
    await service.setup();

    const res = await service.benchmarkFileLimits('readme.md');

    expect(res.errors).to.not.be.empty;
    expect(res.errors[0].error.message).to.include('not an ".apex" file');
  });

  // TODO re-implement
  // it('should return error if dir contains no apex', async () => {
  //   await service.setup();

  //   const res = await service.benchmarkLimits({ paths: ['force-app'] });

  //   expect(res.errors).to.not.be.empty;
  //   expect(res.errors[0].error.message).to.include('No ".apex" files found');
  // });
});
