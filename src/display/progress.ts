/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import chalk from "chalk";
import symbols from "log-symbols";
import type { BenchmarkResult, ErrorResult } from "../benchmark/base.js";

export class ProgressReporter<R extends BenchmarkResult = BenchmarkResult> {
  begin(name: string): void {}
  beginAction(action: string): void {}
  pass(result: R): void {}
  fail(error: ErrorResult): void {}
  endAction(): void {}
  end(): void {}
}

export class LogProgressReporter<
  R extends BenchmarkResult,
> extends ProgressReporter<R> {
  protected out = console.log;
  protected err = console.error;

  begin(name: string): void {
    this.out();
    this.out("  " + name);
  }

  beginAction(action: string): void {
    this.out("    " + chalk.grey(action));
  }

  pass(result: R): void {
    this.out(`    ${symbols.success} ${chalk.green("complete")}`);
  }

  fail(errResult: ErrorResult): void {
    this.out(
      `    ${symbols.error} ${chalk.red("failed:")} ${errResult.error.message}`
    );
  }

  endAction(): void {
    this.out();
  }

  end(): void {}
}
