/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  AnonApexBenchmarkFactory,
  AnonApexBenchmarkResult,
} from '../../benchmark/anon';
import { ErrorResult } from '../../benchmark/base';
import { ApexScriptParser, ApexScriptParserOptions } from '../../parser/apex';
import { ApexScriptError } from '../../parser/apex/error';
import { ApexScript } from '../../parser/apex/script';

export interface AnonApexBenchmarkerRequest<O> {
  code?: string;
  paths?: string[];
  parser?: ApexScriptParserOptions;
  options?: O;
}

export interface AnonApexBenchmarkRun<T, C> {
  benchmarks: AnonApexBenchmarkResult<T, C>[];
  errors: ErrorResult[];
}

export class AnonApexBenchmarker<T, C, O> {
  private factory: AnonApexBenchmarkFactory<T, C, O>;

  constructor(factory: AnonApexBenchmarkFactory<T, C, O>) {
    this.factory = factory;
  }

  async runBenchmark(
    request: AnonApexBenchmarkerRequest<O>
  ): Promise<AnonApexBenchmarkRun<T, C>> {
    try {
      const { code, paths } = request;
      const scriptParser = new ApexScriptParser(request.parser);

      if (code) {
        return this.run(scriptParser.parse(code), request);
      } else if (paths && paths.length > 0) {
        const runs: AnonApexBenchmarkRun<T, C>[] = [];

        for await (const script of scriptParser.parsePaths(...paths)) {
          runs.push(await this.run(script, request));
        }

        return this.mergeRuns(runs);
      } else {
        throw new Error(
          'Empty benchmark request - must specify code or at least one path'
        );
      }
    } catch (e) {
      return {
        benchmarks: [],
        errors: [{ error: e instanceof Error ? e : new Error(`${e}`) }],
      };
    }
  }

  private async run(
    script: ApexScript | ApexScriptError,
    request: AnonApexBenchmarkerRequest<O>
  ): Promise<AnonApexBenchmarkRun<T, C>> {
    if (script instanceof ApexScriptError) {
      return {
        benchmarks: [],
        errors: [{ error: script }],
      };
    }

    // TODO handle bench creation script validation errors
    const benchmark = this.factory.create(script, request.options);

    await benchmark.run();

    return {
      benchmarks: benchmark.results(),
      errors: benchmark.errors(),
    };
  }

  private mergeRuns(
    runs: AnonApexBenchmarkRun<T, C>[]
  ): AnonApexBenchmarkRun<T, C> {
    return runs.reduce<AnonApexBenchmarkRun<T, C>>(
      (dir, res) => {
        dir.benchmarks.push(...res.benchmarks);
        dir.errors.push(...res.errors);
        return dir;
      },
      { benchmarks: [], errors: [] }
    );
  }
}
