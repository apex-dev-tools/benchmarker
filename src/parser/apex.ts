/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AnonymousUnitContext,
  ApexParserFactory,
  ApexSyntaxError,
} from '@apexdevtools/apex-parser';

export interface ApexScriptParserOptions {
  /**
   * Dictionary of string replacement applied on Apex code.
   *
   * @example
   * replace: { '%var': '100', ... }
   * // Integer i = %var; -> Integer i = 100;
   */
  replace?: Record<string, string>;

  /**
   * Remove pattern or text from Apex code.
   */
  exclude?: (RegExp | string)[];
}

export type ApexScriptRoot = AnonymousUnitContext;

export interface ApexFileRef {
  path?: string;
  rootPath?: string;
}

export interface ApexScript extends ApexFileRef {
  root: ApexScriptRoot;
  source: string;
}

export class ApexScriptError extends Error {
  path?: string;
  rootPath?: string;
  sample?: { line: number; column: number; sourceLine: string };

  constructor(obj: unknown, ref?: ApexFileRef, source?: string) {
    if (obj instanceof ApexSyntaxError) {
      super(obj.message);
      const sourceLine = this.extractSourceLine(source, obj.line);
      if (sourceLine) {
        this.sample = { line: obj.line, column: obj.column, sourceLine };
      }
    } else {
      super(obj instanceof Error ? obj.message : `${obj}`);
    }
    this.path = ref?.path;
    this.rootPath = ref?.rootPath;
  }

  private extractSourceLine(
    source: string | undefined,
    line: number
  ): string | undefined {
    if (!source) return undefined;
    const lines = source.split('\n');
    const index = line - 1;
    return lines[index];
  }
}

export class ApexScriptParser {
  private replacePatterns: [RegExp, string][];

  constructor(options: ApexScriptParserOptions = {}) {
    this.replacePatterns = this.createReplacePatterns(options);
  }

  parse(code: string, ref?: ApexFileRef): ApexScript | ApexScriptError {
    const source = this.applyReplacePatterns(code);
    try {
      return {
        root: ApexParserFactory.createParser(source, true).anonymousUnit(),
        source,
      };
    } catch (e) {
      return new ApexScriptError(e, ref, source);
    }
  }

  async *parsePaths(
    ...paths: string[]
  ): AsyncGenerator<ApexScript | ApexScriptError> {
    for (const p of paths) {
      const absolutePath = path.resolve(p);
      const stats = await fs.stat(absolutePath);

      if (stats.isFile() && this.hasApexExt(absolutePath)) {
        yield await this.loadScriptFile(absolutePath);
      } else if (stats.isDirectory()) {
        for await (const p of this.walkApex(absolutePath)) {
          yield await this.loadScriptFile(p, absolutePath);
        }
      } else {
        yield new ApexScriptError(
          `${absolutePath} is not a directory or ".apex" file.`,
          { path: absolutePath }
        );
      }
    }
  }

  private async loadScriptFile(
    filePath: string,
    rootPath?: string
  ): Promise<ApexScript | ApexScriptError> {
    try {
      const code = await fs.readFile(filePath, { encoding: 'utf8' });
      return this.parse(code, { path: filePath, rootPath });
    } catch (e) {
      return new ApexScriptError(e, { path: filePath, rootPath });
    }
  }

  private async *walkApex(dir: string): AsyncGenerator<string> {
    for await (const d of await fs.opendir(dir)) {
      const entry = path.join(dir, d.name);
      if (d.isDirectory()) yield* this.walkApex(entry);
      else if (d.isFile() && this.hasApexExt(d.name)) yield entry;
    }
  }

  private hasApexExt(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.apex';
  }

  private createReplacePatterns(
    options: ApexScriptParserOptions
  ): [RegExp, string][] {
    const { replace, exclude } = options;
    const entries: [RegExp, string][] = [];

    if (replace) {
      Object.entries(replace).forEach(([token, value]) =>
        entries.push([new RegExp(this.escapeRegex(token), 'g'), value])
      );
    }

    exclude?.forEach(ent => entries.push([new RegExp(ent, 'g'), '']));

    return entries;
  }

  private applyReplacePatterns(code: string): string {
    return this.replacePatterns.reduce<string>(
      (text, [regex, value]) => text.replace(regex, value),
      code
    );
  }

  private escapeRegex(text: string): string {
    return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }
}
