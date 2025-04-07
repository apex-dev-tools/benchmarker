/*
 * Copyright (c) 2019-2020 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { stub, restore } from 'sinon';
import * as utils from '../../../src/services/salesforce/utils';
import * as env from '../../../src/shared/env';

describe('src/services/salesforce/utils', () => {
  afterEach(() => {
    restore();
  });

  describe('replaceNamespace', () => {
    it('returns namespace replace', async () => {
      stub(env, 'getUnmanagePackages').returns(['abc', 'bcd']);

      const text = utils.replaceNamespace('abc__test bcd__test2');
      expect(text).to.be.equal('test test2');
    });

    it('returns original text', async () => {
      stub(env, 'getUnmanagePackages').returns([]);

      const text = utils.replaceNamespace('abc__test');
      expect(text).to.be.equal('abc__test');
    });
  });
});
