/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as env from '../../src/shared/env';
import sinon from 'sinon';
import fs from 'fs';

describe('shared/env/index', () => {
  afterEach(() => {
    sinon.restore();
    process.env.CUSTOM_RANGES_PATH = '';
  });

  describe('getDatabaseUrl', () => {
    it('returns supplied value when value is supplied', () => {
      // Given
      process.env.DATABASE_URL = 'test';

      // When
      const databaseUrl = env.getDatabaseUrl();

      // Then
      expect(databaseUrl).to.eql('test');
    });

    it('returns default value when value is not supplied', () => {
      // Given
      delete process.env.DATABASE_URL;

      // When
      const databaseUrl = env.getDatabaseUrl();

      // Then
      expect(databaseUrl).to.eql('');
    });
  });

  describe('isHeadless', () => {
    it('returns true when HEADLESS is true', () => {
      // Given
      process.env.HEADLESS = 'true';

      // When
      const isHeadless = env.isHeadless();

      // Then
      expect(isHeadless).to.be.true;
    });

    it('returns false when HEADLESS is false', () => {
      // Given
      process.env.HEADLESS = 'false';

      // When
      const isHeadless = env.isHeadless();

      // Then
      expect(isHeadless).to.be.false;
    });

    it('returns false when HEADLESS is undefined', () => {
      // Given
      process.env.HEADLESS = undefined;

      // When
      const isHeadless = env.isHeadless();

      // Then
      expect(isHeadless).to.be.false;
    });
  });

  describe('shouldStoreAlerts', () => {
    it('returns true when STORE_ALERTS is true', () => {
      // Given
      process.env.STORE_ALERTS = 'true';

      // When
      const shouldStoreAlerts = env.shouldStoreAlerts();

      // Then
      expect(shouldStoreAlerts).to.be.true;
    });

    it('returns false when STORE_ALERTS is false', () => {
      // Given
      process.env.STORE_ALERTS = 'false';

      // When
      const shouldStoreAlerts = env.shouldStoreAlerts();

      // Then
      expect(shouldStoreAlerts).to.be.false;
    });

    it('returns false when STORE_ALERTS is undefined', () => {
      // Given
      process.env.STORE_ALERTS = undefined;

      // When
      const shouldStoreAlerts = env.shouldStoreAlerts();

      // Then
      expect(shouldStoreAlerts).to.be.false;
    });
  });

  describe('isDebug', () => {
    it('returns true when NODE_ENV is debug', () => {
      // Given
      process.env.NODE_ENV = 'debug';

      // When
      const isDebug = env.isDebug();

      // Then
      expect(isDebug).to.be.true;
    });

    it('returns false when NODE_ENV is undefined', () => {
      // Given
      process.env.NODE_ENV = undefined;

      // When
      const isDebug = env.isDebug();

      // Then
      expect(isDebug).to.be.false;
    });

    it('returns false when NODE_ENV is production', () => {
      // Given
      process.env.NODE_ENV = 'production';

      // When
      const isDebug = env.isDebug();

      // Then
      expect(isDebug).to.be.false;
    });
  });

  describe('getPuppeteerLaunchOptions', () => {
    it('returns debug-friendly config in debug mode', () => {
      // Given/When
      const launchOptions = env.getPuppeteerLaunchOptions(false);

      // Then
      expect(launchOptions).to.eql({
        args: [
          "--proxy-server='direct://'",
          '--proxy-bypass-list=*',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1920,1080',
          '--disable-dev-shm-usage',
        ],
        headless: false,
        slowMo: 100,
        timeout: 0,
      });
    });

    it('returns production-friendly config in non-debug mode', () => {
      // Given/When
      const launchOptions = env.getPuppeteerLaunchOptions(true);

      // Then
      expect(launchOptions).to.eql({
        args: [
          "--proxy-server='direct://'",
          '--proxy-bypass-list=*',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1920,1080',
          '--disable-dev-shm-usage',
        ],
        headless: true,
        slowMo: 100,
        timeout: 0,
      });
    });
  });

  describe('getIsIncognitoBrowser', () => {
    it('returns incognito_browser given value', () => {
      // Given
      process.env.INCOGNITO_BROWSER = 'true';

      // When
      const incognitoBrowser = env.getIsIncognitoBrowser();

      // Then
      expect(incognitoBrowser).to.eql(true);
    });
    it('return default value when port is not set', () => {
      // Given
      delete process.env.INCOGNITO_BROWSER;

      // When
      const incognitoBrowser = env.getIsIncognitoBrowser();

      // Then
      expect(incognitoBrowser).to.eql(false);
    });
  });

  describe('getLighthouseHTMLReport', () => {
    it('returns LIGHTHOUSE_REPORT given value', () => {
      // Given
      process.env.LIGHTHOUSE_HTML_REPORT = 'true';

      // When
      const lighthouseReport = env.getLighthouseHTMLReport();

      // Then
      expect(lighthouseReport).to.eql(true);
    });
    it('return default value when LIGHTHOUSE_REPORT is not set', () => {
      // Given
      delete process.env.LIGHTHOUSE_HTML_REPORT;

      // When
      const lighthouseReport = env.getLighthouseHTMLReport();

      // Then
      expect(lighthouseReport).to.eql(true);
    });
  });

  describe('getLighthouseEnabled', () => {
    it('returns getLighthouseEnabled given value', () => {
      // Given
      process.env.LIGHTHOUSE_ENABLED = 'true';

      // When
      const lighthouseEnabled = env.getLighthouseEnabled();

      // Then
      expect(lighthouseEnabled).to.eql(true);
    });
    it('return default value when getLighthouseEnabled is not set', () => {
      // Given
      delete process.env.LIGHTHOUSE_ENABLED;

      // When
      const lighthouseEnabled = env.getLighthouseEnabled();

      // Then
      expect(lighthouseEnabled).to.eql(false);
    });
  });

  describe('getLinesInitial', () => {
    it('returns LINES_INITIAL given value', () => {
      // Given
      process.env.LINES_INITIAL = '10';

      // When
      const initialLines = env.getLinesInitial();

      // Then
      expect(initialLines).to.eql('10');
    });
    it('return default value when LINES_INITIAL is not set', () => {
      // Given
      delete process.env.LINES_INITIAL;

      // When
      const initialLines = env.getLinesInitial();

      // Then
      expect(initialLines).to.eql('-1');
    });
  });

  describe('getLinesMaximum', () => {
    it('returns LINES_MAXIMUM given value', () => {
      // Given
      process.env.LINES_MAXIMUM = '10';

      // When
      const maxLines = env.getLinesMaximum();

      // Then
      expect(maxLines).to.eql('10');
    });
    it('return default value when LINES_MAXIMUM is not set', () => {
      // Given
      delete process.env.LINES_MAXIMUM;

      // When
      const maxLines = env.getLinesMaximum();

      // Then
      expect(maxLines).to.eql('-1');
    });
  });

  describe('getLinesIteration', () => {
    it('returns LINES_ITERATION given value', () => {
      // Given
      process.env.LINES_ITERATION = '10';

      // When
      const linesIteration = env.getLinesIteration();

      // Then
      expect(linesIteration).to.eql('10');
    });
    it('return default value when LINES_ITERATION is not set', () => {
      // Given
      delete process.env.LINES_ITERATION;

      // When
      const linesIteration = env.getLinesIteration();

      // Then
      expect(linesIteration).to.eql('-1');
    });
  });

  describe('getDocumentsInitial', () => {
    it('returns DOCUMENTS_INITIAL given value', () => {
      // Given
      process.env.DOCUMENTS_INITIAL = '10';

      // When
      const initialDocuments = env.getDocumentsInitial();

      // Then
      expect(initialDocuments).to.eql('10');
    });
    it('return default value when DOCUMENTS_INITIAL is not set', () => {
      // Given
      delete process.env.DOCUMENTS_INITIAL;

      // When
      const initialDocuments = env.getDocumentsInitial();

      // Then
      expect(initialDocuments).to.eql('-1');
    });
  });

  describe('getDocumentsMaximum', () => {
    it('returns DOCUMENTS_MAXIMUM given value', () => {
      // Given
      process.env.DOCUMENTS_MAXIMUM = '10';

      // When
      const maxDocs = env.getDocumentsMaximum();

      // Then
      expect(maxDocs).to.eql('10');
    });
    it('return default value when DOCUMENTS_MAXIMUM is not set', () => {
      // Given
      delete process.env.DOCUMENTS_MAXIMUM;

      // When
      const maxDocs = env.getDocumentsMaximum();

      // Then
      expect(maxDocs).to.eql('-1');
    });
  });

  describe('getDocumentsIteration', () => {
    it('returns DOCUMENTS_ITERATION given value', () => {
      // Given
      process.env.DOCUMENTS_ITERATION = '10';

      // When
      const documentsIteration = env.getDocumentsIteration();

      // Then
      expect(documentsIteration).to.eql('10');
    });
    it('return default value when DOCUMENTS_ITERATION is not set', () => {
      // Given
      delete process.env.DOCUMENTS_ITERATION;

      // When
      const documentsIteration = env.getDocumentsIteration();

      // Then
      expect(documentsIteration).to.eql('-1');
    });
  });

  describe('getUnmanagePackages', () => {
    it('returns UNMANAGE_PACKAGES given value', () => {
      // Given
      process.env.UNMANAGE_PACKAGE = 'abc,def,ghi';

      // When
      const region = env.getUnmanagePackages();

      // Then
      expect(region).to.eql(['abc', 'def', 'ghi']);
    });
    it('return default value when UNMANAGE_PACKAGES is not set', () => {
      // Given
      delete process.env.UNMANAGE_PACKAGE;

      // When
      const region = env.getUnmanagePackages();

      // Then
      expect(region).to.eql([]);
    });
  });

  describe('getAsyncMonitorTimeout', () => {
    it('returns DOCUMENTS_ITERATION given value', () => {
      // Given
      process.env.ASYNC_MONITOR_TIMEOUT = '120';

      // When
      const asyncMonitorTimeout = env.getAsyncMonitorTimeout();

      // Then
      expect(asyncMonitorTimeout).to.eql('120');
    });
    it('return default value when DOCUMENTS_ITERATION is not set', () => {
      // Given
      delete process.env.ASYNC_MONITOR_TIMEOUT;

      // When
      const asyncMonitorTimeout = env.getAsyncMonitorTimeout();

      // Then
      expect(asyncMonitorTimeout).to.eql('60');
    });
  });

  describe('getExternalBuildId', () => {
    it('returns EXTERNAL_BUILD_ID given value', () => {
      // Given
      process.env.EXTERNAL_BUILD_ID = 'Test Pipeline - build 1';

      // When
      const externalBuildId = env.getExternalBuildId();

      // Then
      expect(externalBuildId).to.eql('Test Pipeline - build 1');
    });
    it('return default value when EXTERNAL_BUILD_ID is not set', () => {
      // Given
      delete process.env.EXTERNAL_BUILD_ID;

      // When
      const externalBuildId = env.getExternalBuildId();

      // Then
      expect(externalBuildId).to.eql('');
    });
  });

  describe('getSourceRef', () => {
    it('returns supplied value when value is supplied', () => {
      // Given
      process.env.SOURCE_REF = 'test';

      // When
      const sourceRef = env.getSourceRef();

      // Then
      expect(sourceRef).to.eql('test');
    });

    it('returns default value when value is not supplied', () => {
      // Given
      delete process.env.SOURCE_REF;

      // When
      const sourceRef = env.getSourceRef();

      // Then
      expect(sourceRef).to.eql('');
    });
  });

  describe('getAppLauncherSelector', () => {
    it('returns APP_LAUNCHER_SELECTOR given value', () => {
      // Given
      process.env.APP_LAUNCHER_SELECTOR = 'Test Pipeline - build 1';

      // When
      const value = env.getAppLauncherSelector();

      // Then
      expect(value).to.eql('Test Pipeline - build 1');
    });
    it('return default value when APP_LAUNCHER_SELECTOR is not set', () => {
      // Given
      delete process.env.APP_LAUNCHER_SELECTOR;

      // When
      const value = env.getAppLauncherSelector();

      // Then
      expect(value).to.eql('.appLauncher > one-app-launcher-header');
    });
  });

  describe('getAppLanucherAllTabsSelector', () => {
    it('returns APP_LAUNCHER_ALL_TABS_SELECTOR given value', () => {
      // Given
      process.env.APP_LAUNCHER_ALL_TABS_SELECTOR = 'Test Pipeline - build 1';

      // When
      const value = env.getAppLanucherAllTabsSelector();

      // Then
      expect(value).to.eql('Test Pipeline - build 1');
    });
    it('return default value when APP_LAUNCHER_ALL_TABS_SELECTOR is not set', () => {
      // Given
      delete process.env.APP_LAUNCHER_ALL_TABS_SELECTOR;

      // When
      const value = env.getAppLanucherAllTabsSelector();

      // Then
      expect(value).to.eql(
        'one-app-launcher-menu > div > lightning-button[class*="button"]'
      );
    });
  });

  describe('getAppLauncherTabSelector', () => {
    it('returns APP_LAUNCHER_ALL_TABS_SELECTOR given value', () => {
      // Given
      process.env.APP_LAUNCHER_ALL_TABS_SELECTOR =
        'Test tab=$tabName, attribute=$tabAttribute';

      // When
      const value = env.getAppLauncherTabSelector('Tab', 'Attribute');

      // Then
      expect(value).to.eql('Test tab=Tab, attribute=Attribute');
    });
    it('return default value when APP_LAUNCHER_ALL_TABS_SELECTOR is not set', () => {
      // Given
      delete process.env.APP_LAUNCHER_ALL_TABS_SELECTOR;

      // When
      const value = env.getAppLauncherTabSelector('Tab', 'Attribute');

      // Then
      expect(value).to.eql(
        'one-app-launcher-tab-item a[data-label="Tab"]Attribute'
      );
    });
  });

  describe('getRangeCollection', () => {
    beforeEach(() => {
      env.clearCache();
    });

    it('throws an error when file content is not vaild', async () => {
      // Given
      process.env.CUSTOM_RANGES_PATH = '../../temp.json';
      const jsonContent = 'test';
      sinon.stub(fs, 'readFileSync').returns(jsonContent);
      try {
        // When
        env.getRangeCollection();
        expect.fail();
      } catch (e) {
        expect(e.message).contains('is not valid JSON');
      }
    });

    it('returns default ranges when CUSTOM_RANGES_PATH is not set', () => {
      delete process.env.CUSTOM_RANGES_PATH;
      const defaultRanges = env.getRangeCollection(); // Should return defaults

      expect(defaultRanges).to.be.an('object');
      expect(defaultRanges).to.have.property('dml_ranges');
      expect(defaultRanges.dml_ranges).to.be.an('array');
    });

    it('returns custom ranges when CUSTOM_RANGES_PATH is set', () => {
      process.env.CUSTOM_RANGES_PATH = '/fake/path.json';

      const jsonContent =
        '{"soql_ranges":[{"start_range":0,"end_range":60,"offset_threshold":5}]}';
      sinon.stub(fs, 'readFileSync').returns(jsonContent);

      const customRanges = env.getRangeCollection();

      expect(customRanges).to.be.an('object');
      expect(customRanges).to.have.property('soql_ranges');
      expect(customRanges.soql_ranges).to.be.an('array');
    });
  });
});
