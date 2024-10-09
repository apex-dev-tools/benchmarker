/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import type ts from 'typescript';
import type { TransformerExtras, PluginConfig } from 'ts-patch';
import fs from 'node:fs';
import path from 'node:path';

// TS transformer to load/bundle supporting Apex file(s) as inline string

// helpful links
// https://ts-ast-viewer.com/
// https://github.com/nonara/ts-patch
// https://github.com/itsdouges/typescript-transformer-handbook

// Purpose - replace:
// require('path/to/file.apex')
// 'the file contents'

export default function (
  program: ts.Program,
  pluginConfig: PluginConfig,
  { ts: tsInstance }: TransformerExtras
) {
  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visit(node: ts.Node): ts.Node {
        if (
          tsInstance.isCallExpression(node) &&
          node.expression.getText() === 'require' &&
          tsInstance.isStringLiteral(node.arguments[0])
        ) {
          const file = node.arguments[0].text;

          if (file.endsWith('.apex')) {
            const sourcePath = path.dirname(sourceFile.fileName);
            const filePath = path.resolve(sourcePath, file);
            console.log(`Inlining apex: ${filePath}`);
            const contents = fs.readFileSync(filePath).toString();

            // potentially inject template literal refs

            return ctx.factory.createStringLiteral(contents);
          }
        }
        return tsInstance.visitEachChild(node, visit, ctx);
      }

      return tsInstance.visitNode(sourceFile, visit);
    };
  };
}
