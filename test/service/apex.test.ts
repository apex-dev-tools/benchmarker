/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub, SinonStubbedInstance } from 'sinon';
import mockfs from 'mock-fs';
import * as limits from '../../src/benchmark/apex/limits';
import * as legacy from '../../src/benchmark/apex/legacy';
import { ApexBenchmarkService } from '../../src/service/apex';

import {
  GovernorLimits,
  LimitsContext,
} from '../../src/benchmark/apex/schemas';
import { MockRunContext } from '../mocks';
import { ApexBenchmarkResult } from '../../src/benchmark/apex';
import { BenchmarkOrg } from '../../src/salesforce/org';
import { PostgresDataSource } from '../../src/database/postgres';
import { AnonApexBenchmark } from '../../src/benchmark/apex/anon';

const legacyContent = `
GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
apexCode
GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();
GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);
System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
`;

describe('service/apex', () => {
  let anonStub: SinonStub;
  let anonStubInstance: SinonStubbedInstance<
    AnonApexBenchmark<GovernorLimits, LimitsContext>
  >;
  let legacyStub: SinonStub;
  let orgStub: SinonStubbedInstance<BenchmarkOrg>;
  let pgStub: SinonStubbedInstance<PostgresDataSource>;
  let service: ApexBenchmarkService;

  beforeEach(() => {
    const mockRun = MockRunContext.createMock(sinon);
    mockRun.stubGlobals();
    orgStub = mockRun.stubOrg();
    pgStub = mockRun.stubPg(true);

    anonStubInstance = sinon.createStubInstance(limits.LimitsAnonApexBenchmark);
    anonStub = sinon
      .stub(limits, 'LimitsAnonApexBenchmark')
      .returns(anonStubInstance);
    legacyStub = sinon
      .stub(legacy, 'LegacyAnonApexBenchmark')
      .returns(anonStubInstance);

    anonStubInstance.results.returns([]);
    anonStubInstance.error.returns(undefined);
    anonStubInstance.prepare.resolves();
    anonStubInstance.run.resolves();

    mockfs({
      'test/scripts/': {
        'script1.apex': 'apexCode',
        'script2.apex': 'apexCode',
        'other.ts': 'script should not run',
      },
      'test/scripts/nested/dir/script3.apex': 'apexCode',
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
    const results: ApexBenchmarkResult[] = [
      {
        name: 'script1',
        action: { name: '1' },
        data: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const res = await service.benchmarkFile('test/scripts/script1.apex');

    expect(orgStub.connect).to.be.calledOnce;
    expect(pgStub.connect).to.be.calledOnce;
    expect(anonStub).to.be.calledOnceWith({
      name: 'script1',
      code: 'apexCode',
    });
    expect(anonStubInstance.prepare).to.be.calledOnce;
    expect(anonStubInstance.run).to.be.calledOnce;
    expect(res.benchmarks).to.eql(results);
  });

  it('should run benchmarks on a script directory', async () => {
    const results: ApexBenchmarkResult[] = [
      {
        name: 'script1',
        action: { name: '1' },
        data: {} as GovernorLimits,
      },
      {
        name: 'script2',
        action: { name: '1' },
        data: {} as GovernorLimits,
      },
      {
        name: 'nested/dir/script3',
        action: { name: '1' },
        data: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns([results[0]]);
    anonStubInstance.results.onSecondCall().returns([results[1]]);
    anonStubInstance.results.onThirdCall().returns([results[2]]);

    const res = await service.benchmarkDirectory('test/scripts');

    expect(orgStub.connect).to.be.calledOnce;
    expect(pgStub.connect).to.be.calledOnce;
    expect(anonStub).to.be.calledThrice;
    expect(anonStub).to.be.calledWith({
      name: 'script1',
      code: 'apexCode',
    });
    expect(anonStub).to.be.calledWith({
      name: 'script2',
      code: 'apexCode',
    });
    expect(anonStub).to.be.calledWith({
      name: 'nested/dir/script3',
      code: 'apexCode',
    });
    expect(anonStubInstance.prepare).to.be.calledThrice;
    expect(anonStubInstance.run).to.be.calledThrice;
    expect(res.benchmarks).to.eql(results);
  });

  it('should run a benchmark for an apex string', async () => {
    const results: ApexBenchmarkResult[] = [
      {
        name: 'script1',
        action: { name: '1' },
        data: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const res = await service.benchmarkCode('apex', {
      name: 'test name',
    });

    expect(orgStub.connect).to.be.calledOnce;
    expect(pgStub.connect).to.be.calledOnce;
    expect(anonStub).to.be.calledOnceWith({
      name: 'test name',
      code: 'apex',
    });
    expect(anonStubInstance.prepare).to.be.calledOnce;
    expect(anonStubInstance.run).to.be.calledOnce;
    expect(res.benchmarks).to.eql(results);
  });

  it('should support legacy apex content', async () => {
    const results: ApexBenchmarkResult[] = [
      {
        name: 'script4',
        action: { name: '1' },
        data: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const res = await service.benchmarkDirectory('legacy/test/scripts');

    expect(orgStub.connect).to.be.calledOnce;
    expect(pgStub.connect).to.be.calledOnce;
    expect(legacyStub).to.be.calledOnceWith({
      name: 'script4',
      code: legacyContent,
    });
    expect(anonStubInstance.prepare).to.be.calledOnce;
    expect(anonStubInstance.run).to.be.calledOnce;
    expect(res.benchmarks).to.eql(results);
  });

  it('should throw if specific file is not apex', async () => {
    await service.setup();

    await expect(service.benchmarkFile('readme.md')).to.be.rejectedWith(
      'not an ".apex" file'
    );
  });

  it('should throw if dir contains no apex', async () => {
    await service.setup();

    await expect(service.benchmarkDirectory('force-app')).to.be.rejectedWith(
      'No ".apex" files found'
    );
  });
});
