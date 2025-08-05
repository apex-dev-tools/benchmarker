/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { HttpRequest } from "@jsforce/jsforce-node";
import { TestContext } from "@salesforce/core/testSetup";
import { expect } from "chai";
import mockfs from "mock-fs";
import sinon, { type SinonStub, type SinonStubbedInstance } from "sinon";
import type { PostgresDataSource } from "../../src/database/postgres.js";
import type { BenchmarkOrg } from "../../src/salesforce/org.js";
import {
  ApexBenchmarkService,
  type LimitsBenchmarkResult,
} from "../../src/service/apex.js";
import { execAnonDataResponse } from "../helpers.js";
import { mockLimits, MockRunContext } from "../mocks.js";

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

const apexCode = [1, 2, 3].map(i => apexContent(i));

describe("service/apex", () => {
  const $$ = new TestContext({ sinon });
  let requestStub: SinonStub;
  let orgStub: SinonStubbedInstance<BenchmarkOrg>;
  let pgStub: SinonStubbedInstance<PostgresDataSource>;
  let service: ApexBenchmarkService;

  beforeEach(async () => {
    const ctx = MockRunContext.createMock(sinon);
    ctx.stubGlobals();
    orgStub = ctx.stubSfOrg(await ctx.stubSfConnection());
    pgStub = ctx.stubPg(true);

    requestStub = sinon.stub();
    $$.fakeConnectionRequest = requestStub;
    requestStub.resolves(execAnonDataResponse(mockLimits));

    mockfs({
      "test/scripts/": {
        "script1.apex": apexCode[0],
        "script2.apex": apexCode[1],
        "other.ts": "script should not run",
      },
      "test/scripts/nested/dir/script3.apex": apexCode[2],
      "legacy/test/scripts/script4.apex": legacyContent,
      "force-app/main/default/classes/": {
        "ApexClass.cls": "apex class code",
        "ApexClass.cls-meta.xml": "xml",
      },
      "readme.md": "markdown text",
    });

    service = new ApexBenchmarkService();
  });

  afterEach(() => {
    sinon.restore();
    mockfs.restore();
    MockRunContext.reset();
  });

  it("should run a benchmark for a specific apex file", async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: "script1",
        action: "1",
        data: mockLimits,
        context: undefined,
      },
    ];

    const res = await service.benchmarkFileLimits("test/scripts/script1.apex");

    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(requestStub).to.be.calledOnce;
    expect(res.errors).to.be.empty;
    expect(res.benchmarks).to.eql(results);
  });

  it("should run benchmarks on a script directory", async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: "script3",
        action: "3",
        data: mockLimits,
        context: undefined,
      },
      {
        name: "script1",
        action: "1",
        data: mockLimits,
        context: undefined,
      },
      {
        name: "script2",
        action: "2",
        data: mockLimits,
        context: undefined,
      },
    ];

    const res = await service.benchmarkLimits({ paths: ["test/scripts"] });

    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(requestStub).to.be.calledThrice;
    expect(res.errors).to.be.empty;
    expect(res.benchmarks).to.eql(results);
  });

  it("should run a benchmark for an apex string", async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: "script1",
        action: "1",
        data: mockLimits,
        context: undefined,
      },
    ];
    const code = "start(); Integer i = 0; stop();";
    const res = await service.benchmarkLimits({
      code,
      options: {
        id: {
          name: "script1",
          action: "1",
        },
      },
    });

    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(requestStub).to.be.calledOnce;
    const req = requestStub.firstCall.args[0] as HttpRequest;
    expect(req.body).to.include(`${code}\ndone();`);
    expect(res.errors).to.be.empty;
    expect(res.benchmarks).to.eql(results);
  });

  it("should support legacy apex content", async () => {
    const results: LimitsBenchmarkResult[] = [
      {
        name: "script4",
        action: "4",
        data: mockLimits,
        context: undefined,
      },
    ];

    const res = await service.benchmarkLimits({
      paths: ["legacy/test/scripts/script4.apex"],
      options: {
        id: {
          name: "script4",
          action: "4",
        },
      },
    });

    expect(orgStub.connect.calledOnce).to.be.true;
    expect(pgStub.connect.calledOnce).to.be.true;
    expect(requestStub).to.be.calledOnce;
    expect(res.errors).to.be.empty;
    expect(res.benchmarks).to.eql(results);
  });

  it("should return error if specific file is not apex", async () => {
    await service.setup();

    const res = await service.benchmarkFileLimits("readme.md");

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
