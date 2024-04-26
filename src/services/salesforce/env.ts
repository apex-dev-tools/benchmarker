/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

export function getSalesforceUsername() {
	return process.env.SF_USERNAME || '';
}

export function getSalesforcePassword() {
	return process.env.SF_PASSWORD || '';
}

export function getSalesforceToken() {
	return process.env.SF_TOKEN || '';
}

export function getSalesforceUrlLogin() {
	return process.env.SF_LOGIN || '';
}

export function getSfdxUsername() {
	return process.env.SFDX_USERNAME || '';
}
