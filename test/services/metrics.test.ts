/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import { stub, restore, SinonStub } from 'sinon';
import { Page, Browser } from 'puppeteer';
import { Substitute } from '@fluffy-spoon/substitute';
import { getLighthouseMetrics, getLighthouseMetricsAndSaveFile } from '../../src/services/metrics';
import * as fs from '../../src/services/filesystem/filesystem';
import * as lighthouse from 'lighthouse';

chai.use(sinonChai);

describe('/src/services/metrics', () => {

	let lighthouseMock: SinonStub;

	before(() => process.env.INCOGNITO_BROWSER = 'false');

	beforeEach(() => {
		lighthouseMock = stub(lighthouse, 'default');
	});

	after(() => delete process.env.INCOGNITO_BROWSER);

	afterEach(() => {
		restore();
	});

	describe('getLighthouseMetrics', () => {

		it('getLighthouseMetrics in headless mode', async () => {
			// Given
			const chromeWsEndpoint = 'ws://${host}:1234/devtools/browser/<id> ';
			const pageInstance = Substitute.for<Page>();
			const browserInstance = Substitute.for<Browser>();

			browserInstance.wsEndpoint().returns(chromeWsEndpoint);
			pageInstance.browser().returns(browserInstance);

			lighthouseMock.resolves({
				artifacts: '',
				report: JSON.stringify(
					{
						audits:
						{
							testMetric: {
								numericValue: 123
							}
						}
					}),
			});

			const lighthouseOptions = {
				throttlingMethod: 'provided',
				disableStorageReset: true,
				formFactor: 'desktop',
				output: 'json',
				port: 1234
			};
			// When
			const metrics = await getLighthouseMetrics(pageInstance);

			// Then
			const expectedProcessedMetrics = [
				{
					metric: 'testMetric',
					value: 123
				}
			];

			expect(lighthouseMock).to.have.been.calledOnce;
			expect(lighthouseMock.args[0][1]).to.be.deep.equal(lighthouseOptions);
			expect(metrics).to.be.eql(expectedProcessedMetrics);
		});
	});

	describe('getLighthouseMetricsAndSaveFile', () => {

		it('getLighthouseMetricsAndSaveFile in headless mode', async () => {
			// Given
			const chromeWsEndpoint = 'ws://${host}:1234/devtools/browser/<id> ';
			const pageInstance = Substitute.for<Page>();
			const browserInstance = Substitute.for<Browser>();

			browserInstance.wsEndpoint().returns(chromeWsEndpoint);
			pageInstance.browser().returns(browserInstance);

			lighthouseMock.resolves({
				artifacts: '',
				report: '<html>DATA<html>',
			});

			const lighthouseOptions = {
				throttlingMethod: 'provided',
				disableStorageReset: true,
				formFactor: 'desktop',
				output: 'html',
				port: 1234
			};

			const saveFile = stub(fs, 'saveFileIntoDir').resolves();
			// When
			await getLighthouseMetricsAndSaveFile('dir', 'file', pageInstance);

			// Then
			expect(saveFile).to.have.been.calledOnce;
			expect(saveFile.args[0][2]).to.be.deep.equal('<html>DATA<html>');
			expect(lighthouseMock).to.have.been.calledOnce;
			expect(lighthouseMock.args[0][1]).to.be.deep.equal(lighthouseOptions);
		});
	});
});
