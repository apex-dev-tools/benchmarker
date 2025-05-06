/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

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
   * Remove text or pattern from Apex code.
   */
  exclude?: (RegExp | string)[];
}

export class ApexScriptParser {
  protected replaceEntries: [RegExp, string][] = [];

  setup(
    replaceEntries: [RegExp, string][],
    options?: ApexScriptParserOptions
  ): void {
    const { replace, exclude } = options || {};
    this.replaceEntries = replaceEntries;

    if (replace) {
      Object.entries(replace).forEach(([token, value]) =>
        this.replaceEntries.push([
          new RegExp(this.escapeRegex(token), 'g'),
          value,
        ])
      );
    }

    exclude?.forEach(ent =>
      this.replaceEntries.push([new RegExp(ent, 'g'), ''])
    );
  }

  parse(code: string): string {
    return this.replaceEntries.reduce<string>(
      (text, [regex, value]) => text.replace(regex, value),
      code
    );
  }

  private escapeRegex(text: string): string {
    return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }
}
