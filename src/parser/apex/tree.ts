/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

// Use script.getText(startIndex, stopIndex) to retrieve source slice
export interface ApexLocation {
  line: number;
  column: number;
  startIndex: number;
  stopIndex: number;
}

export enum ApexNature {
  Class = "Class",
  Interface = "Interface",
  Method = "Method",
  Enum = "Enum",
  Property = "Property",
  Field = "Field",
  Statement = "Statement",
  Expression = "Expression",
  MethodCall = "MethodCall",
  Assignment = "Assignment",
  Id = "Id",
  String = "String",
  Number = "Number",
  Boolean = "Boolean",
  Null = "Null",
}

export const literalNatures = [
  ApexNature.String,
  ApexNature.Number,
  ApexNature.Boolean,
  ApexNature.Null,
];
export const methodParamNatures = [
  ...literalNatures,
  ApexNature.Id,
  ApexNature.Expression,
];

export interface ApexScriptNode {
  nature?: ApexNature;
  children?: AnyAnonNode[];
}

export interface AnonNodeWrapper extends Omit<ApexScriptNode, "nature"> {
  children: AnyAnonNode[];
}

export interface AnonNode extends ApexScriptNode {
  nature: ApexNature;
  children?: AnyAnonNode[];
  /**
   * Location of the entire containing block or statement. Set on top level
   * elements.
   */
  blockLocation?: ApexLocation;
}

export type AnonMemberNature =
  | ApexNature.Class
  | ApexNature.Interface
  | ApexNature.Method
  | ApexNature.Enum
  | ApexNature.Property;

export interface AnonMember extends AnonNode {
  nature: AnonMemberNature;
  name: string;
}

export interface AnonField extends AnonNode {
  nature: ApexNature.Field;
  children: AnyAnonNode[];
  typeRef: string;
}

export interface AnonStatement extends AnonNode {
  nature: ApexNature.Statement;
}

export interface AnonAssignment extends AnonNode {
  nature: ApexNature.Assignment;
  children: AnyAnonNode[];
}

export interface AnonId extends AnonNode {
  nature: ApexNature.Id;
  location: ApexLocation;
  value: string;
}

export interface AnonExpression extends AnonNode {
  nature: ApexNature.Expression;
  location: ApexLocation;
  value: string;
}

export type AnonLiteralNature =
  | ApexNature.String
  | ApexNature.Number
  | ApexNature.Boolean
  | ApexNature.Null;

export interface AnonLiteral extends AnonNode {
  nature: AnonLiteralNature;
  location: ApexLocation;
  value: string | number | boolean | null;
}

export interface AnonLiteralString extends AnonLiteral {
  nature: ApexNature.String;
  value: string;
}

export interface AnonLiteralNumber extends AnonLiteral {
  nature: ApexNature.Number;
  value: number;
}

export interface AnonLiteralBoolean extends AnonLiteral {
  nature: ApexNature.Boolean;
  value: boolean;
}

export interface AnonLiteralNull extends AnonLiteral {
  nature: ApexNature.Null;
  value: null;
}

export type AnonLiteralAny =
  | AnonLiteralString
  | AnonLiteralNumber
  | AnonLiteralBoolean
  | AnonLiteralNull;

export type AnonMethodParam = AnonLiteralAny | AnonId | AnonExpression;

export interface AnonMethodCall extends AnonNode {
  nature: ApexNature.MethodCall;
  name: string;
  location: ApexLocation;
  children: AnonMethodParam[];
  /**
   * A reference for this method call. The left hand side of a dot expression,
   * as text.
   */
  ref?: string;
  /**
   * The field or variable assignment of this method call.
   */
  assignment?: AnonField | AnonAssignment;
}

export type AnyAnonNode =
  | AnonMember
  | AnonField
  | AnonStatement
  | AnonAssignment
  | AnonId
  | AnonExpression
  | AnonMethodCall
  | AnonLiteralAny;
