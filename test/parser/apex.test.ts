/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexParserFactory } from '@apexdevtools/apex-parser';
import { expect } from 'chai';
import { ApexScriptVisitor } from '../../src/parser/apex/visitor';
import { ApexScript } from '../../src/parser/apex/script';
import { AnonNodeWrapper } from '../../src/parser/apex/tree';

describe('parser/apex', () => {
  it('should parse apex script', () => {
    const source = `
    context.thresholds = true;

    GovernorLimits limits;
    GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();

    benchmark.describe('test');

    describe('foo', 0, bar);
    {
      poo();
    }
    done();

    public class Foo {}

    limits = (new GovernorLimits()).getLimitsDiff(initialLimits, (new GovernorLimits()).getCurrentGovernorLimits());

    if (false) {
    
    }

    System.assert(false, '-_' + JSON.serialize(limits) + '_-');
    `;

    const unit = ApexParserFactory.createParser(source, true).anonymousUnit();
    const visitor = new ApexScriptVisitor();
    const root = visitor.visit(unit);
    const script = new ApexScript(source, root as AnonNodeWrapper);

    expect(script).to.be.instanceof(ApexScript);
  });
});
