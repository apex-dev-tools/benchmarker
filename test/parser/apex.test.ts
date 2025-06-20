/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { ApexParserFactory } from '@apexdevtools/apex-parser';
import { expect } from 'chai';
import { ApexScriptVisitor } from '../../src/parser/apex/visitor';

describe('parser/apex', () => {
  it('should parse apex script', () => {
    const source = `
    GovernorLimits limits;
    GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();

    benchmark.describe('test');

    describe('foo', 0, bar);

    public class Foo {}

    limits = (new GovernorLimits()).getLimitsDiff(initialLimits, (new GovernorLimits()).getCurrentGovernorLimits());

    if (false) {}

    System.assert(false, '-_' + JSON.serialize(limits) + '_-');
    `;

    const unit = ApexParserFactory.createParser(source, true).anonymousUnit();
    const visitor = new ApexScriptVisitor();
    const root = visitor.visit(unit);

    expect(root.nature).to.be.undefined;
  });
});
