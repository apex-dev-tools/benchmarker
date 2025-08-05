/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type {
  AnonApexBenchmarkFactory,
  AnonApexBenchmarkResult,
} from '../../benchmark/anon.js';
import { Benchmark, type ErrorResult } from '../../benchmark/base.js';
import {
  ApexScriptParser,
  type ApexScriptParserOptions,
} from '../../parser/apex.js';
import { ApexScriptError } from '../../parser/apex/error.js';
import type { ApexScript } from '../../parser/apex/script.js';
import { RunContext } from '../../state/context.js';

export interface AnonApexBenchmarkerRequest<O> {
  code?: string;
  paths?: string[];
  parserOptions?: ApexScriptParserOptions;
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
      const scriptParser = new ApexScriptParser(
        this.setParserNamespaceExclusions(request.parserOptions)
      );

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
        errors: [Benchmark.coerceError(e)],
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

    const benchmark = this.factory.create(script, request.options);

    await benchmark.run();

    return {
      benchmarks: benchmark.results(),
      errors: benchmark.errors(),
    };
  }

  private setParserNamespaceExclusions(
    options: ApexScriptParserOptions = {}
  ): ApexScriptParserOptions {
    const namespaces = RunContext.current.org.getNamespaceRegExp();
    if (namespaces.length === 0) {
      return options;
    }

    return {
      ...options,
      exclude: (options.exclude || []).concat(namespaces),
      replace: options.replace,
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
