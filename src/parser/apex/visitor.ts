/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  type AnonymousBlockMemberContext,
  ApexParser,
  ApexParserBaseVisitor,
  type ApexParserRuleContext,
  type ApexParserVisitor,
  type ApexParseTree,
  type ApexTerminalNode,
  type ApexToken,
  AssignExpressionContext,
  type ClassDeclarationContext,
  DotExpressionContext,
  type EnumDeclarationContext,
  type ExpressionContext,
  type FieldDeclarationContext,
  type IdContext,
  type InterfaceDeclarationContext,
  type LiteralContext,
  type MethodCallContext,
  MethodCallExpressionContext,
  type MethodDeclarationContext,
  PrimaryExpressionContext,
  type PropertyDeclarationContext,
  type StatementContext,
} from '@apexdevtools/apex-parser';
import {
  type AnonAssignment,
  type AnonExpression,
  type AnonField,
  type AnonId,
  type AnonLiteral,
  type AnonMember,
  type AnonMemberNature,
  type AnonMethodCall,
  type AnonMethodParam,
  type AnonNodeWrapper,
  type AnyAnonNode,
  type ApexLocation,
  ApexNature,
  type ApexScriptNode,
  methodParamNatures,
} from './tree.js';

// Method is on all rules
type VisitableApex = ApexParseTree & {
  accept<Result>(visitor: ApexParserVisitor<Result>): Result;
};

// Statement expression types to visit
const stmtExpressions: (typeof ExpressionContext)[] = [
  DotExpressionContext,
  MethodCallExpressionContext,
  AssignExpressionContext,
];

export class ApexScriptVisitor
  extends ApexParserBaseVisitor<ApexScriptNode>
  implements ApexParserVisitor<ApexScriptNode>
{
  visit(ctx: ApexParseTree): ApexScriptNode {
    return ctx ? (ctx as VisitableApex).accept(this) : {};
  }

  visitChildren(ctx: ApexParserRuleContext): AnonNodeWrapper {
    const children: AnyAnonNode[] = [];
    if (ctx.children) {
      for (const child of ctx.children) {
        const node = this.visit(child);
        if (!node) {
          // TerminalNode (Token) / ErrorNode
          continue;
        }

        // Flatten/merge wrapped nodes
        this.forNode(node, anon => children.push(anon));
      }
    }

    return { children };
  }

  visitAnonymousBlockMember(ctx: AnonymousBlockMemberContext): ApexScriptNode {
    const memCtx: ApexParseTree =
      ctx.anonymousMemberDeclaration() ?? ctx.statement();
    const blockLocation = this.getLocation(ctx);

    return this.mapNode(this.visit(memCtx), anon => ({
      ...anon,
      blockLocation,
    }));
  }

  visitStatement(ctx: StatementContext): ApexScriptNode {
    const block = ctx.block();
    if (block) {
      return this.visit(block);
    }

    const expr = ctx.expressionStatement()?.expression();
    if (expr && stmtExpressions.some(ex => expr instanceof ex)) {
      return this.visit(expr);
    }

    return {
      nature: ApexNature.Statement,
    };
  }

  visitId(ctx: IdContext): AnonId {
    return {
      nature: ApexNature.Id,
      location: this.getLocation(ctx),
      value: this.getText(ctx),
    };
  }

  visitLiteral(ctx: LiteralContext): ApexScriptNode {
    const terminal = ctx.children?.[0];
    if (!terminal || !this.isTerminalNode(terminal)) {
      return {};
    }
    return this.createLiteral(terminal.symbol, this.getLocation(ctx));
  }

  visitDotExpression(ctx: DotExpressionContext): ApexScriptNode {
    const method = ctx.dotMethodCall();
    if (method) {
      return this.createMethodCall(
        this.getText(method.anyId()),
        this.getLocation(ctx),
        method.expressionList()?.expression_list() || [],
        this.getText(ctx.expression())
      );
    }

    // namespace/property access etc.
    return {
      nature: ApexNature.Expression,
      location: this.getLocation(ctx),
      value: this.getText(ctx),
    } as AnonExpression;
  }

  visitMethodCall(ctx: MethodCallContext): ApexScriptNode {
    const methodId = ctx.id();
    if (methodId) {
      return this.createMethodCall(
        this.getText(methodId),
        this.getLocation(ctx),
        ctx.expressionList()?.expression_list() || []
      );
    }

    return {}; // this/super
  }

  visitFieldDeclaration(ctx: FieldDeclarationContext): ApexScriptNode {
    const decCtx = ctx.variableDeclarators();
    const [children, method] = this.extractMethodCall(
      this.visit(decCtx).children || []
    );
    const field: AnonField = {
      nature: ApexNature.Field,
      typeRef: this.getText(ctx.typeRef()),
      children,
    };

    if (method) {
      method.assignment = field;
      return method;
    }

    return field;
  }

  visitAssignExpression(ctx: AssignExpressionContext): ApexScriptNode {
    const expr = ctx.expression_list() || [];
    const [children, method] = this.extractMethodCall(
      this.flatMapNodes(
        expr.map(ex => this.visit(ex)),
        n => n
      )
    );

    const asgn: AnonAssignment = {
      nature: ApexNature.Assignment,
      children,
    };

    if (method) {
      method.assignment = asgn;
      return method;
    }

    return asgn;
  }

  // Unused root member types - only block location/presence tracked
  visitClassDeclaration(ctx: ClassDeclarationContext): ApexScriptNode {
    return this.createMember(ctx.id(), ApexNature.Class);
  }
  visitInterfaceDeclaration(ctx: InterfaceDeclarationContext): ApexScriptNode {
    return this.createMember(ctx.id(), ApexNature.Interface);
  }
  visitMethodDeclaration(ctx: MethodDeclarationContext): ApexScriptNode {
    return this.createMember(ctx.id(), ApexNature.Method);
  }
  visitEnumDeclaration(ctx: EnumDeclarationContext): ApexScriptNode {
    return this.createMember(ctx.id(), ApexNature.Enum);
  }
  visitPropertyDeclaration(ctx: PropertyDeclarationContext): ApexScriptNode {
    return this.createMember(ctx.id(), ApexNature.Property);
  }

  private createMember(
    idCtx: IdContext | null,
    nature: AnonMemberNature
  ): AnonMember {
    return {
      nature,
      name: this.getText(idCtx),
    };
  }

  private createLiteral(token: ApexToken, location: ApexLocation): AnonLiteral {
    switch (token.type) {
      case ApexParser.StringLiteral:
        return {
          nature: ApexNature.String,
          location,
          value: token.text.slice(1, -1), // remove ''
        };
      case ApexParser.IntegerLiteral:
      case ApexParser.NumberLiteral:
      case ApexParser.LongLiteral:
        return {
          nature: ApexNature.Number,
          location,
          value: this.toNumber(token.text),
        };
      case ApexParser.BooleanLiteral:
        return {
          nature: ApexNature.Boolean,
          location,
          value: token.text.toLowerCase() === 'true',
        };
      default:
        return {
          nature: ApexNature.Null,
          location,
          value: null,
        };
    }
  }

  private createMethodCall(
    name: string,
    location: ApexLocation,
    paramExpr: ExpressionContext[],
    ref?: string
  ): AnonMethodCall {
    const params: AnonMethodParam[] = [];
    for (const expr of paramExpr) {
      if (!(expr instanceof PrimaryExpressionContext)) {
        params.push({
          nature: ApexNature.Expression,
          location: this.getLocation(expr),
          value: this.getText(expr),
        });
        continue;
      }

      this.forNode(
        this.visit(expr),
        node => this.isAnonMethodParam(node) && params.push(node)
      );
    }

    return {
      nature: ApexNature.MethodCall,
      name,
      location,
      children: params,
      ref,
    };
  }

  private extractMethodCall(
    nodes: AnyAnonNode[]
  ): [AnyAnonNode[], AnonMethodCall | undefined] {
    // returns node list and first method call removed
    return nodes.reduce<[AnyAnonNode[], AnonMethodCall | undefined]>(
      (pair, node) => {
        if (!pair[1] && node.nature == ApexNature.MethodCall) {
          pair[1] = node;
        } else {
          pair[0].push(node);
        }
        return pair;
      },
      [[], undefined]
    );
  }

  private getText(ctx: ApexParserRuleContext | null): string {
    // This will be without whitespace / hidden tokens like comments
    // more predictable for ids, references to be matched against
    // use location indexes to get original text from source later
    return ctx ? ctx.getText() : '';
  }

  private getLocation(ctx: ApexParserRuleContext): ApexLocation {
    // Extract start line/col, and string index positions for slicing
    const startToken = ctx.start;
    const stopToken = ctx.stop;

    return {
      line: startToken.line,
      column: startToken.column,
      startIndex: startToken.start,
      stopIndex: stopToken ? stopToken.stop : startToken.stop,
    };
  }

  private toNumber(text: string): number {
    // convert to Number - remove last L/D char if present on longs/double
    const suffix = text.slice(-1).toUpperCase();
    const num = suffix === 'D' || suffix === 'L' ? text.slice(0, -1) : text;
    return Number(num);
  }

  private forNode(
    node: ApexScriptNode,
    anonHandler: (n: AnyAnonNode) => void
  ): void {
    if (this.isAnonNode(node)) {
      anonHandler(node);
    } else if (node.children?.length) {
      node.children.forEach(child => anonHandler(child));
    }
  }

  private mapNode(
    node: ApexScriptNode,
    anonHandler: (n: AnyAnonNode) => AnyAnonNode
  ): AnyAnonNode | AnonNodeWrapper {
    const nodes = this.flatMapNodes([node], anonHandler);
    return nodes.length === 1 ? nodes[0] : { children: nodes };
  }

  private flatMapNodes(
    nodes: ApexScriptNode[],
    anonHandler: (n: AnyAnonNode) => AnyAnonNode
  ): AnyAnonNode[] {
    return nodes.flatMap(node => {
      if (this.isAnonNode(node)) {
        return [anonHandler(node)];
      } else if (node.children?.length) {
        return node.children.map(child => anonHandler(child));
      }
      return [];
    });
  }

  private isTerminalNode(
    node: ApexParseTree | ApexTerminalNode
  ): node is ApexTerminalNode {
    return (node as ApexTerminalNode).symbol != null;
  }

  private isAnonNode(node: ApexScriptNode): node is AnyAnonNode {
    return node.nature != null;
  }

  private isAnonMethodParam(node: AnyAnonNode): node is AnonMethodParam {
    return methodParamNatures.includes(node.nature);
  }
}
