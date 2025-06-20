/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import {
  AnonymousBlockMemberContext,
  ApexParserBaseVisitor,
  ApexParserRuleContext,
  ApexParserVisitor,
  ApexParseTree,
  AssignExpressionContext,
  ClassDeclarationContext,
  DotExpressionContext,
  EnumDeclarationContext,
  ExpressionContext,
  FieldDeclarationContext,
  IdContext,
  InterfaceDeclarationContext,
  LiteralContext,
  MethodCallContext,
  MethodCallExpressionContext,
  MethodDeclarationContext,
  PrimaryExpressionContext,
  PropertyDeclarationContext,
  StatementContext,
} from '@apexdevtools/apex-parser';
import {
  AnonAssignment,
  AnonField,
  AnonId,
  AnonLiteral,
  AnonMember,
  AnonMethodCall,
  AnonMethodParam,
  AnonNode,
  AnonNodeWrapper,
  ApexLocation,
  ApexNature,
  ApexScriptNode,
} from './tree';

type VisitableApex = ApexParseTree & {
  accept<Result>(visitor: ApexParserVisitor<Result>): Result;
};

// Expression types
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
    return (ctx as VisitableApex).accept(this);
  }

  visitChildren(ctx: ApexParserRuleContext): AnonNodeWrapper {
    const children: AnonNode[] = [];
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

    return memCtx
      ? this.mapNode(this.visit(memCtx), anon => ({
          ...anon,
          blockLocation,
        }))
      : {};
  }

  visitStatement(ctx: StatementContext): ApexScriptNode {
    const expr = ctx.expressionStatement()?.expression();

    if (expr && stmtExpressions.some(ex => expr instanceof ex)) {
      return this.visit(expr);
    } else {
      return {
        nature: ApexNature.Statement,
      };
    }
  }

  visitId(ctx: IdContext): AnonId {
    return {
      nature: ApexNature.Id,
      text: this.getText(ctx),
    };
  }

  visitLiteral(ctx: LiteralContext): AnonLiteral {
    return {
      nature: ApexNature.Literal,
      location: this.getLocation(ctx),
      text: this.getText(ctx),
    };
  }

  visitDotExpression(ctx: DotExpressionContext): ApexScriptNode {
    const method = ctx.dotMethodCall();
    if (!method) {
      return {}; // namespace/property access etc.
    }

    return this.createMethodCall(
      this.getText(method.anyId()),
      this.getLocation(ctx),
      method.expressionList()?.expression_list() || [],
      this.getText(ctx.expression())
    );
  }

  visitMethodCall(ctx: MethodCallContext): ApexScriptNode {
    const methodId = ctx.id();
    if (!methodId) {
      return {}; // this/super
    }

    return this.createMethodCall(
      this.getText(methodId),
      this.getLocation(ctx),
      ctx.expressionList()?.expression_list() || []
    );
  }

  visitFieldDeclaration(ctx: FieldDeclarationContext): AnonField {
    const typeCtx = ctx.typeRef();
    const decCtx = ctx.variableDeclarators();
    const decTree = (decCtx && this.visit(decCtx).children) || [];

    const [children, method] = this.extractMethodCall(decTree);

    return {
      nature: ApexNature.Field,
      typeRef: this.getText(typeCtx),
      method,
      children,
    };
  }

  visitAssignExpression(ctx: AssignExpressionContext): AnonAssignment {
    // TODO const expr = ctx.expression_list();

    return {
      nature: ApexNature.Assignment,
      // method,
      // children,
    };
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
    nature: ApexNature
  ): AnonMember {
    return {
      nature,
      name: this.getText(idCtx),
    };
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
          text: this.getText(expr),
        });
        continue;
      }

      this.forNode(
        this.visit(expr),
        node => this.isMethodParam(node) && params.push(node)
      );
    }

    return new AnonMethodCall(name, location, params, ref);
  }

  private extractMethodCall(
    nodes: AnonNode[]
  ): [AnonNode[], AnonMethodCall | undefined] {
    // returns node list and first method call removed
    return nodes.reduce<[AnonNode[], AnonMethodCall | undefined]>(
      (pair, node) => {
        if (!pair[1] && node instanceof AnonMethodCall) {
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
    return ctx ? ctx.getText() : '';
  }

  private getLocation(ctx: ApexParserRuleContext): ApexLocation {
    if (!ctx.stop) {
      throw new Error('Parser context missing stop location');
    }

    // TODO may need some adjustment
    return {
      startLine: ctx.start.line,
      startCol: ctx.start.column,
      endLine: ctx.stop.line,
      endCol: ctx.stop.column + ctx.stop.text.length, // +1 usually
    };
  }

  private forNode(
    node: ApexScriptNode,
    anonHandler: (n: AnonNode) => void
  ): void {
    if (this.isAnonNode(node)) {
      anonHandler(node);
    } else if (node.children?.length) {
      node.children.forEach(child => anonHandler(child));
    }
  }

  private mapNode(
    node: ApexScriptNode,
    anonHandler: (n: AnonNode) => AnonNode
  ): ApexScriptNode {
    if (this.isAnonNode(node)) {
      return anonHandler(node);
    } else if (node.children?.length) {
      return {
        children: node.children.map(child => anonHandler(child)),
      };
    }
    return node;
  }

  private isAnonNode(node: ApexScriptNode): node is AnonNode {
    return node.nature != null;
  }

  private isMethodParam(node: AnonNode): node is AnonMethodParam {
    return [ApexNature.Literal, ApexNature.Id, ApexNature.Expression].includes(
      node.nature
    );
  }
}
