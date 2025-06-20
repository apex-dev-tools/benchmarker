/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

export interface ApexLocation {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

export enum ApexNature {
  Block = 'block',
  Statement = 'statement',
  Expression = 'expression',
  Literal = 'literal',
  Id = 'id',
  Class = 'class',
  Interface = 'interface',
  Method = 'method',
  Enum = 'enum',
  Property = 'property',
  Field = 'field',
  MethodCall = 'method call',
  Assignment = 'assignment',
}

export interface ApexScriptNode {
  nature?: ApexNature;
  children?: AnonNode[];
}

export interface AnonNodeWrapper extends Omit<ApexScriptNode, 'nature'> {
  children: AnonNode[];
}

export interface AnonNode extends ApexScriptNode {
  nature: ApexNature;
  children?: AnonNode[];
  text?: string;
  blockLocation?: ApexLocation;
}

export interface AnonId extends AnonNode {
  nature: ApexNature.Id;
  text: string;
}

export interface AnonLiteral extends AnonNode {
  nature: ApexNature.Literal;
  location: ApexLocation;
  text: string;

  // interpret real type
  // string | number | boolean
}

export interface AnonExpression extends AnonNode {
  nature: ApexNature.Expression;
  text: string;
}

export interface AnonMember extends AnonNode {
  name: string;
}

export interface AnonField extends AnonNode {
  nature: ApexNature.Field;
  typeRef: string;
  method?: AnonMethodCall;
}

export interface AnonAssignment extends AnonNode {
  nature: ApexNature.Assignment;
  method?: AnonMethodCall;
}

export type AnonMethodParam = AnonId | AnonLiteral | AnonExpression;

export class AnonMethodCall implements AnonNode {
  nature: ApexNature.MethodCall;
  name: string;
  location: ApexLocation;
  children: AnonMethodParam[];
  ref?: string;

  constructor(
    name: string,
    location: ApexLocation,
    params: AnonMethodParam[],
    ref?: string
  ) {
    this.nature = ApexNature.MethodCall;
    this.name = name;
    this.location = location;
    this.children = params;
    this.ref = ref;

    this.children.map(p => {});
  }

  // TODO extract args as correct types
  // TODO remove string quotes, coerce number/boolean
}
