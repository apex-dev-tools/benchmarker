/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import type ts from 'typescript';
import type { TransformerExtras, PluginConfig } from 'ts-patch';

// TS transformer to load/bundle supporting Apex file(s) inline

export default function (
  program: ts.Program,
  pluginConfig: PluginConfig,
  { ts: tsInstance }: TransformerExtras
) {
  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      return sourceFile;
    };
  };
}
