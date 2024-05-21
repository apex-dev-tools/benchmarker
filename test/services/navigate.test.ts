/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { getNavigation } from '../../src/services/navigate';
import { navigate as lexNavigator } from '../../src/services/navigate/lex';
import { navigate as classicNavigator } from '../../src/services/navigate/classic';
import * as context from '../../src/services/org/context';
import { SalesforceConnection } from '../../src/services/salesforce/connection';

describe('src/services/navigate/index', async () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should export lex navigator if user is in lex', async () => {
    const connection = {} as SalesforceConnection;

    const authStub = sinon.stub(context, 'getIsLex');
    authStub.withArgs(connection).resolves(true);

    expect(await getNavigation(connection)).to.eql(lexNavigator);
  });

  it('should export classic navigator if user is in classic', async () => {
    const connection = {} as SalesforceConnection;

    const authStub = sinon.stub(context, 'getIsLex');
    authStub.withArgs(connection).resolves(false);

    expect(await getNavigation(connection)).to.eql(classicNavigator);
  });
});
