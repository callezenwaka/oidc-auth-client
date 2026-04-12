// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

// Setter accepts debug as optional for backwards compatibility
interface LoggerInput {
  debug?: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

const nopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

const NONE = 0;
const ERROR = 1;
const WARN = 2;
const INFO = 3;
const DEBUG = 4;

let logger: Logger;
let level: number;

export class Log {
  static get NONE(): number { return NONE; }
  static get ERROR(): number { return ERROR; }
  static get WARN(): number { return WARN; }
  static get INFO(): number { return INFO; }
  static get DEBUG(): number { return DEBUG; }

  static reset(): void {
    level = INFO;
    logger = console;
  }

  static get level(): number {
    return level;
  }
  static set level(value: number) {
    if (NONE <= value && value <= DEBUG) {
      level = value;
    } else {
      throw new Error('Invalid log level');
    }
  }

  static get logger(): Logger {
    return logger;
  }
  static set logger(value: LoggerInput) {
    if (!value.debug) {
      // backwards compat: alias debug to info
      value.debug = value.info;
    }
    logger = value as Logger;
  }

  static debug(...args: any[]): void {
    if (level >= DEBUG) {
      logger.debug.apply(logger, args);
    }
  }
  static info(...args: any[]): void {
    if (level >= INFO) {
      logger.info.apply(logger, args);
    }
  }
  static warn(...args: any[]): void {
    if (level >= WARN) {
      logger.warn.apply(logger, args);
    }
  }
  static error(...args: any[]): void {
    if (level >= ERROR) {
      logger.error.apply(logger, args);
    }
  }
}

Log.reset();
