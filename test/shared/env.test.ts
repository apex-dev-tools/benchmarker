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
