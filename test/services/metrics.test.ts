/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon, { SinonStub } from 'sinon';
import { Page, Browser } from 'puppeteer';
import * as metrics from '../../src/services/metrics';
import * as fs from '../../src/services/filesystem';

chai.use(sinonChai);

describe('/src/services/metrics', () => {
  let lighthouseMock: SinonStub;
  let pageStubInstance: Page;

  beforeEach(async () => {
    process.env.INCOGNITO_BROWSER = 'false';
    lighthouseMock = sinon.stub(metrics, 'lighthouse');

    const endpointStub = sinon.stub();
    const browserInstance = { wsEndpoint: endpointStub } as unknown as Browser;
    endpointStub.returns('ws://${host}:1234/devtools/browser/<id>');
    pageStubInstance = {
      url: sinon.stub().returns('url'),
      browser: sinon.stub().returns(browserInstance),
    } as unknown as Page;
  });

  afterEach(() => {
    delete process.env.INCOGNITO_BROWSER;
    sinon.restore();
  });

  describe('getLighthouseMetrics', () => {
    it('getLighthouseMetrics in headless mode', async () => {
      // Given
      lighthouseMock.resolves({
        artifacts: '',
        report: JSON.stringify({
          audits: {
            testMetric: {
              numericValue: 123,
            },
          },
        }),
      });

      const lighthouseOptions = {
        throttlingMethod: 'provided',
        disableStorageReset: true,
        formFactor: 'desktop',
        output: 'json',
        port: 1234,
      };

      // When
      const result = await metrics.getLighthouseMetrics(pageStubInstance);

      // Then
      const expectedProcessedMetrics = [
        {
          metric: 'testMetric',
          value: 123,
        },
      ];

      expect(lighthouseMock).to.have.been.calledOnce;
      expect(lighthouseMock.args[0][1]).to.be.deep.equal(lighthouseOptions);
      expect(result).to.be.eql(expectedProcessedMetrics);
    });
  });

  describe('getLighthouseMetricsAndSaveFile', () => {
    it('getLighthouseMetricsAndSaveFile in headless mode', async () => {
      // Given
      lighthouseMock.resolves({
        artifacts: '',
        report: '<html>DATA<html>',
      });

      const lighthouseOptions = {
        throttlingMethod: 'provided',
        disableStorageReset: true,
        formFactor: 'desktop',
        output: 'html',
        port: 1234,
      };

      const saveFile = sinon.stub(fs, 'saveFileIntoDir').resolves();

      // When
      await metrics.getLighthouseMetricsAndSaveFile(
        'dir',
        'file',
        pageStubInstance
      );

      // Then
      expect(saveFile).to.have.been.calledOnce;
      expect(saveFile.args[0][2]).to.be.deep.equal('<html>DATA<html>');
      expect(lighthouseMock).to.have.been.calledOnce;
      expect(lighthouseMock.args[0][1]).to.be.deep.equal(lighthouseOptions);
    });
  });
});
