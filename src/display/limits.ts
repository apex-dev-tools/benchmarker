/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { getBorderCharacters, table } from "table";
import type { LimitsBenchmarkResult } from "../service/apex.js";
import { reportDeg, type Degradation } from "../metrics/limits/deg.js";

export enum LimitsReportType {
  TABLE = "table",
  JSON = "json",
}

export interface LimitsReporterOptions {
  reportType?: LimitsReportType;
  jsonFilePath?: string;
}

const headings: string[] = [
  "Action",
  "Duration (ms)",
  "CPU Time (ms)",
  "DML Rows",
  "DML Stmts",
  "Heap (bytes)",
  "Query Rows",
  "SOQL Queries",
  "Queueables",
  "Futures",
];

export class LimitsReporter {
  protected out = console.log;
  protected err = console.error;
  protected options: LimitsReporterOptions = {};

  setup(options: LimitsReporterOptions = {}): void {
    this.options = options;
  }

  run(results: LimitsBenchmarkResult[]): void {
    switch (this.options.reportType) {
      case LimitsReportType.TABLE:
        this.displayTable(results);
        break;
      case LimitsReportType.JSON:
        this.displayJson(results);
        break;
      default:
        this.displayTable(results);
    }
  }

  private displayTable(results: LimitsBenchmarkResult[]): void {
    const tables = results.reduce<Record<string, string[][]>>(
      (tableDict, result) => {
        const tbl = tableDict[result.name] ?? [];
        tbl.push(this.createTableRow(result));
        tableDict[result.name] = tbl;
        return tableDict;
      },
      {}
    );

    Object.entries(tables).forEach(([name, rows]) => {
      this.out();
      this.out(
        table([[name], headings, ...rows], {
          border: getBorderCharacters("norc"),
          columns: { 0: { wrapWord: true } },
          spanningCells: [{ col: 0, row: 0, colSpan: 10 }],
        })
      );
    });
  }

  private createTableRow(result: LimitsBenchmarkResult): string[] {
    const degDict: Partial<Record<string, Degradation>> = result.deg ?? {};
    const row = [result.action];

    Object.entries(result.data).forEach(([key, value]: [string, number]) => {
      // deg existence implies at least one entry is non-zero
      const deg = degDict[key];
      let cell = `${value}`;
      if (deg) {
        const degVal = reportDeg(deg);
        cell = `${value}${degVal > 0 ? chalk.red(` (+${degVal})`) : ""}`;
      }

      row.push(cell);
    });

    return row;
  }

  private displayJson(results: LimitsBenchmarkResult[]): void {
    const content = JSON.stringify(results, undefined, 2);

    if (this.options.jsonFilePath) {
      this.writeFile(this.options.jsonFilePath, content);
    } else {
      this.out();
      this.out(content);
    }
  }

  private writeFile(file: string, content: string): void {
    const fullPath = path.resolve(file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}
