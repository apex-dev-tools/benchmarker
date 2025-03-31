/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon, { SinonStub, SinonStubbedInstance } from 'sinon';
import mockfs from 'mock-fs';
import * as anon from '../../src/benchmark/anonApex';
import * as legacy from '../../src/benchmark/legacy';
import { ApexBenchmarkService } from '../../src/service/apex';
import { SalesforceConnection } from '../../src';
import { GovernorLimits } from '../../src/benchmark/schemas';

const legacyContent = `
GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
apexCode
GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();
GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);
System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
`;

describe('service/apex', () => {
  let anonStub: SinonStub;
  let anonStubInstance: SinonStubbedInstance<anon.AnonApexBenchmark>;
  let legacyStub: SinonStub;

  beforeEach(() => {
    anonStubInstance = sinon.createStubInstance(anon.AnonApexBenchmark);
    anonStub = sinon.stub(anon, 'AnonApexBenchmark').returns(anonStubInstance);
    legacyStub = sinon
      .stub(legacy, 'LegacyAnonApexBenchmark')
      .returns(anonStubInstance);

    anonStubInstance.results.returns([]);
    anonStubInstance.errors.returns([]);
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
  });

  afterEach(() => {
    sinon.restore();
    mockfs.restore();
  });

  it('should run a benchmark for a specific apex file', async () => {
    const results = [
      {
        name: 'script1',
        action: '1',
        limits: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const service = new ApexBenchmarkService({} as SalesforceConnection);

    const res = await service.benchmark('test/scripts/script1.apex');

    expect(anonStub).to.be.calledOnceWith('script1', {
      code: 'apexCode',
      connection: {},
    } as anon.AnonApexBenchmarkParams);
    expect(anonStubInstance.prepare).to.be.calledOnce;
    expect(anonStubInstance.run).to.be.calledOnce;
    expect(res.benchmarks).to.eql(results);
  });

  it('should run benchmarks on a script directory', async () => {
    const params = {
      code: 'apexCode',
      connection: {},
    } as anon.AnonApexBenchmarkParams;
    const results = [
      {
        name: 'script1',
        action: '1',
        limits: {} as GovernorLimits,
      },
      {
        name: 'script2',
        action: '1',
        limits: {} as GovernorLimits,
      },
      {
        name: 'nested/dir/script3',
        action: '1',
        limits: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns([results[0]]);
    anonStubInstance.results.onSecondCall().returns([results[1]]);
    anonStubInstance.results.onThirdCall().returns([results[2]]);

    const service = new ApexBenchmarkService({} as SalesforceConnection);

    const res = await service.benchmark('test/scripts');

    expect(anonStub).to.be.calledThrice;
    expect(anonStub).to.be.calledWith('script1', params);
    expect(anonStub).to.be.calledWith('script2', params);
    expect(anonStub).to.be.calledWith('nested/dir/script3', params);
    expect(anonStubInstance.prepare).to.be.calledThrice;
    expect(anonStubInstance.run).to.be.calledThrice;
    expect(res.benchmarks).to.eql(results);
  });

  it('should run a benchmark for an apex string', async () => {
    const results = [
      {
        name: 'script1',
        action: '1',
        limits: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const service = new ApexBenchmarkService({} as SalesforceConnection);

    const res = await service.benchmarkCode('apex', {
      benchmarkName: 'test name',
    });

    expect(anonStub).to.be.calledOnceWith('test name', {
      code: 'apex',
      connection: {},
    } as anon.AnonApexBenchmarkParams);
    expect(anonStubInstance.prepare).to.be.calledOnce;
    expect(anonStubInstance.run).to.be.calledOnce;
    expect(res.benchmarks).to.eql(results);
  });

  it('should support legacy apex content', async () => {
    const results = [
      {
        name: 'script4',
        action: '1',
        limits: {} as GovernorLimits,
      },
    ];
    anonStubInstance.results.onFirstCall().returns(results);

    const service = new ApexBenchmarkService({} as SalesforceConnection);

    const res = await service.benchmark('legacy/test/scripts');

    expect(legacyStub).to.be.calledOnceWith('script4', {
      code: legacyContent,
      connection: {},
    } as anon.AnonApexBenchmarkParams);
    expect(anonStubInstance.prepare).to.be.calledOnce;
    expect(anonStubInstance.run).to.be.calledOnce;
    expect(res.benchmarks).to.eql(results);
  });

  it('should throw if specific file is not apex', async () => {
    const service = new ApexBenchmarkService({} as SalesforceConnection);

    await expect(service.benchmark('readme.md')).to.be.rejectedWith(
      'not a directory or ".apex" file'
    );
  });

  it('should throw if dir contains no apex', async () => {
    const service = new ApexBenchmarkService({} as SalesforceConnection);

    await expect(service.benchmark('force-app')).to.be.rejectedWith(
      'No ".apex" files found'
    );
  });
});
