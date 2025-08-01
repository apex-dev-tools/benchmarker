/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexSyntaxError } from '@apexdevtools/apex-parser';
import { ApexFile } from '../apex.js';

export class ApexScriptError extends Error {
  file?: ApexFile;
  sample?: { line: number; column: number; sourceLine: string };

  constructor(obj: unknown, ref?: ApexFile, source?: string) {
    if (obj instanceof ApexSyntaxError) {
      super(obj.message);
      const sourceLine = this.extractSourceLine(source, obj.line);
      if (sourceLine) {
        this.sample = { line: obj.line, column: obj.column, sourceLine };
      }
    } else if (typeof obj === 'string') {
      super(obj);
    } else {
      super(obj instanceof Error ? obj.message : 'Unexpected script error.');
    }
    this.file = ref;
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
