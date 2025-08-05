/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexParserFactory } from "@apexdevtools/apex-parser";
import fs from "node:fs/promises";
import path from "node:path";
import { ApexScriptError } from "./apex/error.js";
import { ApexScript } from "./apex/script.js";
import type { AnonNodeWrapper, ApexScriptNode } from "./apex/tree.js";
import { ApexScriptVisitor } from "./apex/visitor.js";

export interface ApexScriptParserOptions {
  /**
   * Dictionary of string replacement applied on Apex code.
   *
   * @example
   * replace: { '$var': '100', ... }
   * // Integer i = $var; -> Integer i = 100;
   */
  replace?: Record<string, string>;

  /**
   * Remove pattern or text from Apex code.
   */
  exclude?: (RegExp | string)[];

  /**
   * When parsing paths, only allow files, not directories.
   */
  filesOnly?: boolean;
}

export interface ApexFile {
  path: string;
  rootPath?: string;
  /**
   * File is not part of a collection/search.
   */
  exclusive?: boolean;
}

export class ApexScriptParser {
  private replacePatterns: [RegExp, string][];
  private visitor: ApexScriptVisitor;
  private filesOnly: boolean;

  constructor(options: ApexScriptParserOptions = {}) {
    this.replacePatterns = this.createReplacePatterns(options);
    this.visitor = new ApexScriptVisitor();
    this.filesOnly = options.filesOnly ?? false;
  }

  parse(code: string, file?: ApexFile): ApexScript | ApexScriptError {
    const source = this.applyReplacePatterns(code);
    try {
      const unit = ApexParserFactory.createParser(source, true).anonymousUnit();
      const root = this.visitor.visit(unit);

      if (!this.isAnonNodeWrapper(root)) {
        return new ApexScriptError("Invalid parse tree.", file, source);
      }

      return new ApexScript(source, root, file);
    } catch (e) {
      return new ApexScriptError(e, file, source);
    }
  }

  async *parsePaths(
    ...paths: string[]
  ): AsyncGenerator<ApexScript | ApexScriptError> {
    const count = paths.length;

    for (const p of paths) {
      const absolutePath = path.resolve(p);
      const stats = await fs.stat(absolutePath);

      if (stats.isFile() && this.hasApexExt(absolutePath)) {
        yield await this.loadScriptFile({
          path: absolutePath,
          exclusive: count === 1,
        });
      } else if (this.filesOnly) {
        yield new ApexScriptError(`${absolutePath} is not an ".apex" file.`, {
          path: absolutePath,
        });
      } else if (stats.isDirectory()) {
        for await (const p of this.walkApex(absolutePath)) {
          yield await this.loadScriptFile({
            path: p,
            rootPath: absolutePath,
            exclusive: false,
          });
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
    file: ApexFile
  ): Promise<ApexScript | ApexScriptError> {
    try {
      const code = await fs.readFile(file.path, { encoding: "utf8" });
      return this.parse(code, file);
    } catch (e) {
      return new ApexScriptError(e, file);
    }
  }

  private async *walkApex(dir: string): AsyncGenerator<string> {
    for (const d of await fs.readdir(dir, { withFileTypes: true })) {
      const entry = path.join(dir, d.name);
      if (d.isDirectory()) yield* this.walkApex(entry);
      else if (d.isFile() && this.hasApexExt(d.name)) yield entry;
    }
  }

  private hasApexExt(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === ".apex";
  }

  private createReplacePatterns(
    options: ApexScriptParserOptions
  ): [RegExp, string][] {
    const { replace, exclude } = options;
    const entries: [RegExp, string][] = [];

    if (replace) {
      Object.entries(replace).forEach(([token, value]) =>
        entries.push([new RegExp(this.escapeRegex(token), "g"), value])
      );
    }

    exclude?.forEach(ent => entries.push([new RegExp(ent, "g"), ""]));

    return entries;
  }

  private applyReplacePatterns(code: string): string {
    return this.replacePatterns.reduce<string>(
      (text, [regex, value]) => text.replace(regex, value),
      code
    );
  }

  private escapeRegex(text: string): string {
    return text.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  }

  private isAnonNodeWrapper(node: ApexScriptNode): node is AnonNodeWrapper {
    return node.nature == null && node.children != null;
  }
}
