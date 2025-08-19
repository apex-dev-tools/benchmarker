/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { CommandModule, Argv, ArgumentsCamelCase } from "yargs";
import { ApexBenchmarkService } from "../../service/apex.js";

export interface RunLimitsArgs {
  paths?: string[];

  metrics?: boolean;
  "limit-ranges-file"?: string;

  "env-file"?: string;
  "project-id"?: string;

  save?: boolean;
  "save-legacy"?: boolean;
}

export default function (yargs: Argv): CommandModule<unknown, RunLimitsArgs> {
  return {
    command: "limits [paths..]",
    describe: "Run limits benchmarks",
    builder(yargs: Argv): Argv<RunLimitsArgs> {
      return yargs
        .positional("paths", {
          describe:
            "Files/directories with benchmark scripts, defaults to working directory",
          array: true,
          type: "string",
        })
        .options({
          "project-id": {
            describe: "Set project id, required if not set by environment",
            alias: "p",
            string: true,
            requiresArg: true,
          },
          "env-file": {
            describe:
              "Load environment variables file, does not override existing keys",
            alias: "e",
            string: true,
            requiresArg: true,
            defaultDescription: ".env",
          },
          metrics: {
            describe: "Enable degradation metrics for governor limits",
            alias: "m",
            boolean: true,
            defaultDescription: "false",
          },
          "limit-ranges-file": {
            describe:
              "Replace degradation offset conditions using custom JSON file",
            string: true,
            requiresArg: true,
          },
          save: {
            describe:
              "Save results to configured data sources, use --no-save to disable",
            boolean: true,
            defaultDescription: "true",
          },
          "save-legacy": {
            describe:
              "Save results to legacy source, use --no-save-legacy to disable",
            boolean: true,
            defaultDescription: "true",
          },
        });
    },
    handler,
  };
}

async function handler(args: ArgumentsCamelCase<RunLimitsArgs>): Promise<void> {
  const service = ApexBenchmarkService.default;
  const paths: string[] = args.paths || [process.cwd()];

  await service.setup({
    global: {
      envFile: args.envFile,
      projectId: args.projectId,
    },
    pg: {
      enable: args.save,
    },
    useLegacySchema: args.saveLegacy,
    limitsMetrics: {
      enable: args.metrics,
      rangesFile: args.limitRangesFile,
    },
  });

  const run = await service.benchmarkLimits({ paths });

  run.errors.forEach(({ benchmark, error }) => {
    let prefix = "";
    if (benchmark) prefix = `${benchmark.name} - ${benchmark.action}:`;
    console.error(`${prefix}${error.message}`);
  });

  if (args.save == null || args.save) await service.save();

  // TODO log run JSON to stdout
}
