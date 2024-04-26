/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as envHelper from '../../../src/services/salesforce/env';

describe('salesforce connection env vars functions', () => {

	describe('getSalesforceUsername', () => {
		it ('returns Salesforce username value when value is supplied', () => {
			// Given
			process.env.SF_USERNAME = 'username';
			// When
			const salesforceUsername = envHelper.getSalesforceUsername();

			// Then
			expect(salesforceUsername).to.eql('username');
		});

		it ('returns default value when value is not supplied', () => {
			// Given
			delete process.env.SF_USERNAME;

			// When
			const salesforceUsername = envHelper.getSalesforceUsername();

			// Then
			expect(salesforceUsername).to.eql('');
		});
	});

	describe('getSalesforcePassword', () => {
		it ('returns Salesforce password value when value is supplied', () => {
			// Given
			process.env.SF_PASSWORD = 'password';
			// When
			const salesforcePassword = envHelper.getSalesforcePassword();

			// Then
			expect(salesforcePassword).to.eql('password');
		});

		it ('returns default value when value is not supplied', () => {
			// Given
			delete process.env.SF_PASSWORD;

			// When
			const salesforcePassword = envHelper.getSalesforcePassword();

			// Then
			expect(salesforcePassword).to.eql('');
		});
	});

	describe('getSalesforceToken', () => {
		it ('returns Salesforce token value when value is supplied', () => {
			// Given
			process.env.SF_TOKEN = 'token';
			// When
			const salesforceToken = envHelper.getSalesforceToken();

			// Then
			expect(salesforceToken).to.eql('token');
		});

		it ('returns default value when value is not supplied', () => {
			// Given
			delete process.env.SF_TOKEN;

			// When
			const salesforceToken = envHelper.getSalesforceToken();

			// Then
			expect(salesforceToken).to.eql('');
		});
	});

	describe('getSalesforceUrlLogin', () => {
		it ('returns Salesforce url login value when value is supplied', () => {
			// Given
			process.env.SF_LOGIN = 'username';
			// When
			const salesforceURLLogin = envHelper.getSalesforceUrlLogin();

			// Then
			expect(salesforceURLLogin).to.eql('username');
		});

		it ('returns default value when value is not supplied', () => {
			// Given
			delete process.env.SF_LOGIN;

			// When
			const salesforceURLLogin = envHelper.getSalesforceUrlLogin();

			// Then
			expect(salesforceURLLogin).to.eql('');
		});
	});

	describe('getSfdxUsername', () => {
		it ('returns Salesforce url login value when value is supplied', () => {
			// Given
			process.env.SFDX_USERNAME = 'sfdxusername';
			// When
			const salesforceSfdxUsername = envHelper.getSfdxUsername();

			// Then
			expect(salesforceSfdxUsername).to.eql('sfdxusername');
		});

		it ('returns default value when value is not supplied', () => {
			// Given
			delete process.env.SFDX_USERNAME;

			// When
			const salesforceSfdxUsername = envHelper.getSfdxUsername();

			// Then
			expect(salesforceSfdxUsername).to.eql('');
		});
	});
});
