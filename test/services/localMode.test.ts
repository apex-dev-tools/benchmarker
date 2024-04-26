/*
 * Copyright (c) 20120 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as localMode from '../../src/services/localMode';

describe('services/local-mode/index', () => {

	describe('runningOnLocalMode', () => {
		it ('returns true when database url is not provided', () => {
			// Given
			delete process.env.DATABASE_URL;

			// When
			const local = localMode.runningOnLocalMode();

			// Then
			expect(local).to.eql(true);
		});

		it ('returns false when database url is provided', () => {
			// Given
			process.env.DATABASE_URL = 'test';

			// When
			const local = localMode.runningOnLocalMode();

			// Then
			expect(local).to.eql(false);
		});
	});
});