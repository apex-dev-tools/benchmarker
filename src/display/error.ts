/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import chalk from "chalk";
import symbols from "log-symbols";
import type { BenchmarkId, ErrorResult } from "../benchmark/base.js";
import { ApexScriptError } from "../parser/apex/error.js";
import { Logger } from "./logger.js";
import { ExecuteAnonymousError } from "../salesforce/execute.js";

export class ErrorReporter {
  protected err = console.error;

  run(errors: ErrorResult[]): void {
    const count = errors.length;
    if (count === 0) return;

    if (count > 1) {
      this.err();
      this.err(
        `  ${symbols.error} ${chalk.red(`${errors.length} errors during run:`)}`
      );
    }

    errors.forEach((err, idx) => this.report(err, idx));

    this.err();
  }

  protected report(result: ErrorResult, index: number): void {
    const { benchmark, error } = result;
    const id = benchmark ? `${this.getIdString(benchmark)}: ` : "";

    this.err();
    this.err(`  ${index}) ${id}${chalk.red(`${error.message}`)}`);
    if (error.stack) {
      this.err();
      this.err(chalk.grey(`  ${error.stack}`));
    }
  }

  protected log({ benchmark, error }: ErrorResult): void {
    const preamble = benchmark
      ? `Failed benchmark '${benchmark.name} - ${benchmark.action}'`
      : "Error";
    Logger.error(`${preamble}: ${error.message}`, error);
  }

  protected getIdString(benchmark: BenchmarkId): string {
    return `${benchmark.name} - ${benchmark.action}`;
  }
}

export class ApexErrorReporter extends ErrorReporter {
  protected report(result: ErrorResult, index: number): void {
    const { error } = result;
    if (error instanceof ApexScriptError) {
      const file = error.file?.path;
      const msg = chalk.red(`${error.message}`);

      this.err();
      this.err(`  ${index}) ${file ? file : msg}`);
      if (file) this.err(`    ${msg}`);

      if (error.sample) {
        this.err();
        this.err(chalk.grey("Source:"));
        this.err(chalk.grey(error.sample.sourceLine));
      }
    } else {
      super.report(result, index);
    }
  }

  protected log(result: ErrorResult): void {
    const { error } = result;
    if (error instanceof ApexScriptError) {
      Logger.error(`Apex script error: ${error.message}`, error);
    } else if (error instanceof ExecuteAnonymousError) {
      Logger.error(`Anon Apex error: ${error.message}`, error);
    } else {
      super.log(result);
    }
  }
}
