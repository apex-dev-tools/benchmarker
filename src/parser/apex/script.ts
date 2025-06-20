/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexFile } from '../apex';
import {
  AnonExpression,
  AnonLiteralBoolean,
  AnonLiteralNumber,
  AnonLiteralString,
  AnonMethodCall,
  AnonMethodParam,
  AnonNodeWrapper,
  AnyAnonNode,
  ApexNature,
} from './tree';

export interface Block<T extends AnyAnonNode> {
  node: T;
  index: number;
}

export type MethodCallDictionary<T extends readonly string[]> = {
  [Key in T[number]]: Block<AnonMethodCall>[];
};

export class ApexScript {
  source: string;
  blockNodes: AnyAnonNode[];
  file?: ApexFile;

  constructor(source: string, root: AnonNodeWrapper, ref?: ApexFile) {
    this.source = source;
    this.blockNodes = root.children;
    this.file = ref;
  }

  static empty(): ApexScript {
    return new ApexScript('', { children: [] });
  }

  getText(start: number, stop: number): string {
    return this.source.slice(start, stop + 1);
  }

  getMethodBlocks(
    filterFn?: (node: AnonMethodCall) => boolean
  ): Block<AnonMethodCall>[] {
    return this.blockNodes.reduce<Block<AnonMethodCall>[]>(
      (methods, node, index) => {
        if (
          node.nature == ApexNature.MethodCall &&
          (!filterFn || filterFn(node))
        ) {
          methods.push({
            node,
            index,
          });
        }
        return methods;
      },
      []
    );
  }

  getMethodDictionary<T extends readonly string[]>(
    names: T
  ): MethodCallDictionary<T> {
    const nameSet = new Set(names);
    const dict = Object.fromEntries<Block<AnonMethodCall>[]>(
      names.map(k => [k, []])
    );

    this.getMethodBlocks(node => nameSet.has(node.name)).forEach(block =>
      dict[block.node.name].push(block)
    );

    return dict as MethodCallDictionary<T>;
  }

  getStringParam(call: AnonMethodCall, index: number): string {
    return this.getMethodParam<AnonLiteralString>(
      call,
      index,
      ApexNature.String
    );
  }

  getNumberParam(call: AnonMethodCall, index: number): number {
    return this.getMethodParam<AnonLiteralNumber>(
      call,
      index,
      ApexNature.Number
    );
  }

  getBooleanParam(call: AnonMethodCall, index: number): boolean {
    return this.getMethodParam<AnonLiteralBoolean>(
      call,
      index,
      ApexNature.Boolean
    );
  }

  getExpressionParam(call: AnonMethodCall, index: number): string {
    return this.getMethodParam<AnonExpression>(
      call,
      index,
      ApexNature.Expression
    );
  }

  getMethodParam<T extends AnonMethodParam>(
    call: AnonMethodCall,
    index: number,
    type: T['nature']
  ): T['value'] {
    const param = call.children.at(index);
    if (!param || param.nature !== type) {
      throw new Error(
        `Expected '${call.name}()' to have '${type}' literal param at index ${index}.`
      );
    }

    return param.value;
  }

  // utils

  // use location indexes to extract or blank/remove text
}
