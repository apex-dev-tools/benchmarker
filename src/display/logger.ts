/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import pino from "pino";

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

let logger: Logger | undefined;

export class Logger {
  private log: pino.Logger;

  private constructor() {
    this.log = pino({
      transport: {
        targets: [{ target: "pino-pretty", options: { destination: 2 } }],
      },
      base: null,
    });
  }

  static get instance(): Logger {
    if (!logger) logger = new Logger();
    return logger;
  }

  error(msg: string, obj?: object): void {
    obj ? this.log.error(obj, msg) : this.log.error(msg);
  }

  warn(msg: string, obj?: object): void {
    obj ? this.log.warn(obj, msg) : this.log.warn(msg);
  }

  info(msg: string, obj?: object): void {
    obj ? this.log.info(obj, msg) : this.log.info(msg);
  }

  debug(msg: string, obj?: object): void {
    obj ? this.log.debug(obj, msg) : this.log.debug(msg);
  }

  setLogLevel(level: LogLevel): void {
    this.log.level = level;
  }

  disable(): void {
    this.log.level = "silent";
  }
}
