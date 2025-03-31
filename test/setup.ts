/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

// avoids having to put in every test file
export function mochaGlobalSetup() {
  chai.use(sinonChai);
  chai.use(chaiAsPromised);
}

// export function mochaGlobalTeardown() {}
