/**
 * @copyright 2025 Certinia Inc. All rights reserved.
 */

const { join } = require('path');
const util = require('util'),
	exec = util.promisify(require('child_process').exec),
	DOTENV_FILEPATH = join(__dirname, '../.env');
const { writeFileSync } = require('fs');

/**
 * Get the scratch org info from a child CLI process and parse it
 * @returns {string} the scratch org info fetched from the org display command
 */
async function getScratchOrgInfo() {
	const getUrlCmd = 'sf org display --json',
		{ stderr, stdout } = await exec(getUrlCmd, { cwd: __dirname });

	if (stderr) {
		throw new Error(stderr);
	}

	const response = JSON.parse(stdout),
		{ accessToken, instanceUrl } = response.result;

	return { accessToken, instanceUrl };
}

/**
 * Generate a property file with the correct salesforce url and access token:
 */
async function generateLoginUrl() {
	const { accessToken, instanceUrl } = await getScratchOrgInfo(),
		template = `# DO NOT CHECK THIS FILE IN WITH PERSONAL INFORMATION SAVED\nSALESFORCE_URL=${instanceUrl}\nACCESS_TOKEN=${accessToken}`;
	writeFileSync(DOTENV_FILEPATH, template);
}

generateLoginUrl();
