/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexParserFactory } from "@apexdevtools/apex-parser";
import { expect } from "chai";
import { ApexScript } from "../../src/parser/apex/script.js";
import type { AnonNodeWrapper } from "../../src/parser/apex/tree.js";
import { ApexScriptVisitor } from "../../src/parser/apex/visitor.js";

describe("parser/apex", () => {
  it("should parse apex script", () => {
    const source = `
    benchmark('name');

    describe('action1');
    {
      start();
      Integer foo = 0;
      stop();
    }

    describe('action2');
    {
      start();
      Integer foo = 0;
      stop();
    }
    `;

    const unit = ApexParserFactory.createParser(source, true).anonymousUnit();
    const visitor = new ApexScriptVisitor();
    const root = visitor.visit(unit);
    const script = new ApexScript(source, root as AnonNodeWrapper);

    expect(script).to.be.instanceof(ApexScript);
  });
});
