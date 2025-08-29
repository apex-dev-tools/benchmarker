/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import path from "node:path";
import pino, { type TransportTargetOptions } from "pino";
import type { PrettyOptions } from "pino-pretty";

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
  NONE = "silent",
}

export interface LoggerOptions {
  file?: string;
  display?: boolean;
  level?: LogLevel;
}

type TransportTarget = TransportTargetOptions<Record<string, any>>;

let logger: pino.Logger | undefined;

export class Logger {
  private constructor() {}

  static setup(opts: LoggerOptions): void {
    const targets: TransportTarget[] = [];

    if (opts.file) {
      targets.push({
        target: "pino/file",
        options: { destination: path.resolve(opts.file) },
      });
    }
    if (opts.display) {
      targets.push({ target: "pino-pretty", options: prettyOptions() });
    }

    if (targets.length) {
      logger = pino({
        transport: {
          targets,
        },
        base: null,
      });
    }
  }

  static reset(): void {
    logger = undefined;
  }

  static error(msg: string, obj?: object): void {
    logger?.error(obj, msg);
  }

  static warn(msg: string, obj?: object): void {
    logger?.warn(obj, msg);
  }

  static info(msg: string, obj?: object): void {
    logger?.info(obj, msg);
  }

  static debug(msg: string, obj?: object): void {
    logger?.debug(obj, msg);
  }

  static setLogLevel(level: LogLevel): void {
    if (logger) {
      logger.level = level;
    }
  }
}

function prettyOptions(): PrettyOptions {
  return {
    destination: 2, // stderr
  };
}
