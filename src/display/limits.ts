/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { getBorderCharacters, table } from "table";
import type { LimitsBenchmarkResult } from "../service/apex.js";
import { reportDeg, type Degradation } from "../metrics/limits/deg.js";
import type { GovernorLimits } from "../benchmark/limits/schemas.js";

export enum LimitsReportType {
  TABLE = "table",
  JSON = "json",
}

export interface LimitsReporterOptions {
  reportType?: LimitsReportType;
  outputFile?: string;
}

type LimitsKey = keyof GovernorLimits;

interface LimitsTable {
  maxActionLen: number;
  rows: string[][];
  cols: LimitsKey[];
}

// defines column order matching headings
// data object iterations unreliable
const limitsKeys: (keyof GovernorLimits)[] = [
  "duration",
  "cpuTime",
  "dmlRows",
  "dmlStatements",
  "heapSize",
  "queryRows",
  "soqlQueries",
  "queueableJobs",
  "futureCalls",
];

const limitsHeadings: Record<keyof GovernorLimits, string> = {
  duration: "Duration (ms)",
  cpuTime: "CPU Time (ms)",
  dmlRows: "DML Rows",
  dmlStatements: "DML Stmts",
  heapSize: "Heap (bytes)",
  queryRows: "Query Rows",
  soqlQueries: "SOQL Queries",
  queueableJobs: "Queueables",
  futureCalls: "Futures",
};

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
    const tables = this.createTablesByName(results);
    const entries = Object.entries(tables);

    this.out();
    this.out(
      chalk.cyan(
        `  Completed ${entries.length} benchmark(s) with ${results.length} result(s).`
      )
    );

    entries.forEach(([name, tbl]) => {
      const header = [chalk.italic(name), ...tbl.cols.map(_ => "")];
      const headings = [
        chalk.bold("Action"),
        ...tbl.cols.map(c => chalk.bold(limitsHeadings[c] ?? "")),
      ];

      this.out();
      this.out(
        table([header, headings, ...tbl.rows], {
          border: getBorderCharacters("norc"),
          columns: {
            // wrapWord causes crash when enabled without width
            0: tbl.maxActionLen > 40 ? { width: 40, wrapWord: true } : {},
          },
          spanningCells: [{ col: 0, row: 0, colSpan: headings.length }],
        })
      );
    });

    this.out();
  }

  private createTablesByName(
    results: LimitsBenchmarkResult[]
  ): Record<string, LimitsTable> {
    const colsDict = this.identifyNonEmptyCols(results);

    return results.reduce<Record<string, LimitsTable>>((tableDict, result) => {
      const tbl = tableDict[result.name] ?? {
        cols: this.createColumnOrder(colsDict[result.name]),
        rows: [],
        maxActionLen: 0,
      };
      tbl.rows.push(this.createTableRow(result, tbl.cols));
      tbl.maxActionLen = Math.max(tbl.maxActionLen, result.action.length);

      tableDict[result.name] = tbl;
      return tableDict;
    }, {});
  }

  private identifyNonEmptyCols(
    results: LimitsBenchmarkResult[]
  ): Record<string, Set<string>> {
    return results.reduce<Record<string, Set<string>>>((keysDict, result) => {
      // always have atleast one data col
      const keys = keysDict[result.name] ?? new Set("duration");

      Object.entries(result.data).forEach(
        ([key, value]: [string, number]) => value > 0 && keys.add(key)
      );

      keysDict[result.name] = keys;
      return keysDict;
    }, {});
  }

  private createColumnOrder(enabledSet?: Set<string>): string[] {
    return enabledSet ? limitsKeys.filter(c => enabledSet.has(c)) : limitsKeys;
  }

  private createTableRow(
    result: LimitsBenchmarkResult,
    colKeys: string[]
  ): string[] {
    const degDict: Partial<Record<string, Degradation>> = result.deg ?? {};
    const cellDict = Object.fromEntries(
      Object.entries(result.data).map(([key, value]: [string, number]) => {
        let cell = `${value}`;
        if (value > 0) {
          // deg existence implies at least one entry is non-zero
          const deg = degDict[key];
          if (deg) {
            const degVal = reportDeg(deg);
            cell = `${value}${degVal > 0 ? chalk.red(` (+${degVal})`) : ""}`;
          }
        }

        return [key, cell];
      })
    );

    return [result.action, ...colKeys.map(key => cellDict[key] ?? "")];
  }

  private displayJson(results: LimitsBenchmarkResult[]): void {
    const content = JSON.stringify(results, undefined, 2);

    if (this.options.outputFile) {
      this.writeFile(this.options.outputFile, content);
    } else {
      this.out();
      this.out(content);
      this.out();
    }
  }

  private writeFile(file: string, content: string): void {
    const fullPath = path.resolve(file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}
