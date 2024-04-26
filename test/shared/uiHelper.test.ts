/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import { spy, restore } from 'sinon';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import * as common from '../../src/shared/uiHelper';

chai.use(sinonChai);

describe('src/scenario/shared/common', () => {

	afterEach(() => {
		restore();
	});

	it("retryMaxAttempsWithDelay negative", async () => {
		const retryFuncSpy = spy(common, "retryMaxAttempsWithDelay");

		const neverWorks = (): Promise<any> => {
			return new Promise<any>((resolve, reject) => {
				reject("Failed!");
			});
		};

		let result;
		try {
			result = await common.retryMaxAttempsWithDelay(neverWorks, 100, 3);
		} catch (err) {
			result = err;
		}

		expect(retryFuncSpy).to.be.calledThrice;
		expect(result).to.be.eql({
			message: "Max attempts reached",
			exception: "Failed!",
		});
	});

	it('retryMaxAttempsWithDelay positive', async () => {
			const retryFuncSpy = spy(common, 'retryMaxAttempsWithDelay');
			let track = 0;

			const sometimesWoksFunc = (): Promise<any> => {
				return new Promise<any>((resolve, reject) => {
					track++;
					if (track % 3 === 0)
						resolve('Done');
					else
						reject('Failed!');
				});
			};

			const result = await common.retryMaxAttempsWithDelay(sometimesWoksFunc, 100, 3);

			expect(retryFuncSpy).to.be.calledThrice;
			expect(result).to.be.eq('Done');
	});
});
