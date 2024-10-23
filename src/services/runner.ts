/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { SalesforceConnection } from './salesforce/connection';
import { replaceTokensInString, TokenReplacement } from './tokenReplacement';
import {
  benchmarkFactory,
  BenchmarkResult,
  ErrorResult,
  TransactionType,
} from './runner/benchmark';
import { ExecuteService } from '@salesforce/apex-node';

export interface RunnerOptions {
  // delay between calls
  // retry config
}

export interface RunnerExecuteOptions {
  /**
   * Name to identify the run in final results.
   *
   * Should only be set if there is one test script.
   */
  name?: string;
  tokens?: TokenReplacement[];
  // disable db result save (for old api / bulk runs)
}

export interface RunnerExecuteCodeOptions extends RunnerExecuteOptions {
  /**
   * Name to identify the run in final results.
   */
  name: string;
  /**
   * For traceability - define an action name for each transaction
   * that will be executed (e.g. test case definitions).
   *
   * This value can also be set in the apex script with `benchmark.setAction()`.
   *
   * If left undefined - actions will be named by their index.
   */
  actions?: string[];
}

export interface ApexRunnerResult {
  benchmarks: BenchmarkResult[];
  errors: ErrorResult[];
}

export class ApexRunner {
  private options: RunnerOptions;
  private service: ExecuteService;

  // TODO logger = default logger (console.log/warn/error)

  constructor(connection: SalesforceConnection, options?: RunnerOptions) {
    this.service = new ExecuteService(connection);
    this.options = options || {};
  }

  async execute(
    apexPath: string,
    options?: RunnerExecuteOptions
  ): Promise<ApexRunnerResult> {
    const { root, paths } = await this.loadFromPath(apexPath);

    const executions: ApexRunnerResult[] = [];
    for (const apexfile of paths) {
      const name =
        options?.name || path.basename(path.relative(root, apexfile), '.apex');

      // TODO generate error result
      const apex = await fs.readFile(apexfile, { encoding: 'utf8' });
      // TODO delay option
      const execution = await this.executeCode(apex, {
        ...options,
        name,
      });
      executions.push(execution);
    }

    return this.mergeResults(executions);
  }

  async executeCode(
    codeStr: string,
    options: RunnerExecuteCodeOptions
  ): Promise<ApexRunnerResult> {
    const benchmark = benchmarkFactory(
      replaceTokensInString(codeStr, options?.tokens)
    );
    const run: ApexRunnerResult = {
      benchmarks: [],
      errors: [],
    };

    for (const { apexCode, transactionType } of benchmark.transactions()) {
      // TODO error/retry/delay handling
      const response = await this.service.executeAnonymous({ apexCode });
      const result = benchmark.result(response, transactionType);

      if (result && 'timeMs' in result) {
        run.benchmarks.push(result);
      } else if (result && 'error' in result) {
        run.errors.push(result);

        if (transactionType === TransactionType.Execute) {
          break; // TODO fail all remaining transactions instead of abort
        }
      }
    }

    return run;
  }

  private async loadFromPath(
    pathStr: string
  ): Promise<{ root: string; paths: string[] }> {
    const absPath = path.resolve(pathStr);
    const stat = await fs.stat(absPath);

    if (stat.isFile()) {
      if (this.isApex(absPath)) {
        return {
          root: path.dirname(absPath),
          paths: [absPath],
        };
      }
      throw new Error(`${absPath} is not a directory or ".apex" file.`);
    }

    const entries = await fs.readdir(absPath, {
      withFileTypes: true,
      recursive: true,
    });

    const paths = entries
      .filter(ent => ent.isFile() && this.isApex(ent.name))
      .map(e => e.parentPath + e.name);

    if (paths.length == 0) {
      throw new Error('No ".apex" files found, check path is correct.');
    }

    return {
      root: absPath,
      paths,
    };
  }

  private isApex(pathStr: string): boolean {
    return path.extname(pathStr).toLowerCase() === '.apex';
  }

  private mergeResults(runs: ApexRunnerResult[]): ApexRunnerResult {
    return runs.reduce(
      (acc, curr) => {
        acc.benchmarks.push(...curr.benchmarks);
        acc.errors.push(...curr.errors);
        return acc;
      },
      { benchmarks: [], errors: [] }
    );
  }
}
