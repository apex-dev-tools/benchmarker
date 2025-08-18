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
  "source-id"?: string;

  "no-postgres"?: boolean;
  "no-legacy-postgres"?: boolean;
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
          "source-id": {
            describe: "Set optional source code version id",
            string: true,
            requiresArg: true,
          },
          "env-file": {
            describe:
              "Load environment variables file, does not override existing keys",
            alias: "e",
            string: true,
            requiresArg: true,
          },
          metrics: {
            describe: "Enable degradation metrics for governor limits",
            alias: "m",
            boolean: true,
          },
          "limit-ranges-file": {
            describe:
              "Replace degradation offset conditions using custom JSON file",
            string: true,
            requiresArg: true,
          },
          "no-postgres": {
            describe: "Disable all postgres connections",
            boolean: true,
          },
          "no-legacy-postgres": {
            describe: "Disable legacy postgres schema output",
            boolean: true,
          },
        });
    },
    handler,
  };
}

async function handler(args: ArgumentsCamelCase<RunLimitsArgs>): Promise<void> {
  const service = ApexBenchmarkService.default;
  const paths: string[] = args.paths || [process.cwd()];

  // TODO --save / --no-save
  // --legacy-schema

  await service.setup({
    global: {
      envFile: args.envFile,
      projectId: args.projectId,
      sourceId: args.sourceId,
    },
    limitsMetrics: {
      enable: args.metrics,
      rangesFile: args.limitRangesFile,
    },
    pg: {
      enable: args.noPostgres == true ? false : undefined,
    },
    useLegacySchema: args.noLegacyPostgres == true ? false : undefined,
  });

  await service.benchmarkLimits({ paths });
  await service.save();

  // TODO log run JSON to stdout
}
