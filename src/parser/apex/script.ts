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

export interface MethodCallGroups {
  local: Block<AnonMethodCall>[];
  external: Block<AnonMethodCall>[];
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

  getTextBetweenBlocks(start: number, stop: number = -1): string {
    const startBlock = this.blockNodes.at(start);
    const stopBlock = start === stop ? startBlock : this.blockNodes.at(stop);
    const startIndex = startBlock?.blockLocation?.startIndex;
    const stopIndex = stopBlock?.blockLocation?.stopIndex;

    if (startIndex == null || stopIndex == null) {
      throw new Error('Failed to extract text from Apex script.');
    }
    return this.getText(startIndex, stopIndex);
  }

  getText(start: number, stop: number): string {
    return this.source.slice(start, stop + 1);
  }

  getMethodCalls(): MethodCallGroups {
    const calls: MethodCallGroups = {
      local: [],
      external: [],
    };

    this.forMethodCalls(block => {
      if (block.node.ref != null) {
        calls.external.push(block);
      } else {
        calls.local.push(block);
      }
    });

    return calls;
  }

  forMethodCalls(fn: (node: Block<AnonMethodCall>) => void): void {
    this.blockNodes.forEach((node, index) => {
      if (node.nature == ApexNature.MethodCall) {
        fn({
          node,
          index,
        });
      }
    });
  }

  toMethodDictionary<T extends readonly string[]>(
    blocks: Block<AnonMethodCall>[],
    names: T
  ): MethodCallDictionary<T> {
    const nameSet = new Set(names);
    const dict = Object.fromEntries<Block<AnonMethodCall>[]>(
      names.map(k => [k, []])
    );

    blocks.forEach(
      block => nameSet.has(block.node.name) && dict[block.node.name].push(block)
    );

    return dict as MethodCallDictionary<T>;
  }

  assertMethodCallOrder(...calls: Block<AnonMethodCall>[]): void {
    calls.forEach((block, callIndex) => {
      const next = calls.at(callIndex + 1);
      if (next && block.index > next.index) {
        throw new Error(
          `${block.node.name}() call must be before ${next.node.name}() call.`
        );
      }
    });
  }

  getBlockInRange<T extends AnyAnonNode>(
    blocks: Block<T>[],
    minBlockIndex: number,
    maxBlockIndex?: number
  ): Block<T> | undefined {
    return blocks.find(
      ({ index }) =>
        index > minBlockIndex &&
        index < (maxBlockIndex || this.blockNodes.length)
    );
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
}
