/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  AnonApexBenchmark,
  AnonApexBenchmarkResult,
} from '../../benchmark/anon';
import { ErrorResult } from '../../benchmark/base';
import {
  ApexScript,
  ApexScriptError,
  ApexScriptParser,
  ApexScriptParserOptions,
} from '../../parser/apex';

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

export type AnonApexBenchmarkCreator<T, C, O> = (
  script: ApexScript,
  options?: O
) => AnonApexBenchmark<T, C>;

export class AnonApexBenchmarker<T, C, O> {
  private createBenchmark: AnonApexBenchmarkCreator<T, C, O>;

  constructor(creator: AnonApexBenchmarkCreator<T, C, O>) {
    this.createBenchmark = creator;
  }

  async runBenchmark(
    request: AnonApexBenchmarkerRequest<O>
  ): Promise<AnonApexBenchmarkRun<T, C>> {
    try {
      const { code, paths, options } = request;
      const scriptParser = new ApexScriptParser(request.parser);

      if (code) {
        return this.run(scriptParser.parse(code), options);
      } else if (paths) {
        const runs: AnonApexBenchmarkRun<T, C>[] = [];

        for await (const script of scriptParser.parsePaths(...paths)) {
          runs.push(await this.run(script, options));
        }

        return this.mergeDirRuns(runs);
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
    options?: O
  ): Promise<AnonApexBenchmarkRun<T, C>> {
    if (script instanceof ApexScriptError) {
      return {
        benchmarks: [],
        errors: [{ error: script }],
      };
    }

    // TODO bench creation script validation errors
    const benchmark = this.createBenchmark(script, options);

    await benchmark.run();

    return {
      benchmarks: benchmark.results(),
      errors: benchmark.errors(),
    };
  }

  private mergeDirRuns(
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
