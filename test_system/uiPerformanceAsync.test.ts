/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */
import { expect } from 'chai';
import { spawn } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import { TransactionProcess } from '../src/';
import {
  saveUiTestResult,
  loadUiTestResults,
} from '../src/database/uiTestResult';
import { UiTestResult } from '../src/database/entity/uiTestResult';
import { cleanDatabase } from './database';

describe('System Test UI Performance', () => {
  before(async function () {
    await cleanDatabase();
    await TransactionProcess.build('MockProduct');
  });

  describe('Artillery UI Performance', function () {
    it('should execute contact record load test and save result to database', async function () {
      this.timeout(120000);

      const RESULTS_PATH = '/tmp/ui-performance-results.json';
      const CONTACT_TEST_KEY = 'browser.step.contact_performance_test';
      const EXPECTED_SUITE_NAME = 'Contact Record Load Test Suite';
      const EXPECTED_TEST_NAME = 'Contact Record Performance Test';

      const testPath = path.join(
        __dirname,
        '../ui/performance/load-contact-record.test.ts'
      );

      // Run Artillery and load results file
      const artilleryResults = await runArtilleryAndLoadResults(
        testPath,
        RESULTS_PATH
      );

      // Convert summaries to UiTestResult instances
      const summaries = artilleryResults.aggregate?.summaries || {};
      const uiTestResults = convertSummariesToUiTestResults(
        summaries,
        CONTACT_TEST_KEY,
        {
          testSuiteName: EXPECTED_SUITE_NAME,
          individualTestName: EXPECTED_TEST_NAME,
        }
      );

      // Save to DB and verify
      await saveUiTestResult(uiTestResults);
      const savedResults = await loadUiTestResults();

      expect(uiTestResults.length).to.equal(1);
      expect(savedResults.length).to.be.greaterThan(0);

      const contactResult = uiTestResults.find(
        r => r.individualTestName === EXPECTED_TEST_NAME
      );
      expect(contactResult).to.exist;

      if (contactResult) {
        expect(contactResult.testSuiteName).to.equal(EXPECTED_SUITE_NAME);
        expect(contactResult.individualTestName).to.equal(EXPECTED_TEST_NAME);
        expect(contactResult.salesforceLoadTime).to.be.greaterThan(0);
        expect(contactResult.componentLoadTime).to.be.greaterThan(0);
        expect(contactResult.overallLoadTime).to.be.greaterThan(0);
      }
    });
  });
});

async function runArtilleryAndLoadResults(
  testPath: string,
  resultsPath: string
): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const proc = spawn('npx', ['artillery', 'run', testPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DEBUG: 'true' },
    });

    let stderr = '';

    proc.stdout.on('data', d => {
      process.stdout.write(`Artillery: ${d.toString()}`);
    });

    proc.stderr.on('data', d => {
      stderr += d.toString();
      process.stderr.write(`Artillery Error: ${d.toString()}`);
    });

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Artillery test timed out'));
    }, 90000);

    proc.on('close', async code => {
      clearTimeout(timeout);
      if (code === 0) {
        try {
          await fs.access(resultsPath);
          const raw = await fs.readFile(resultsPath, 'utf8');
          const data = JSON.parse(raw);
          resolve(data);
        } catch (err) {
          reject(new Error(`Failed to read results: ${err}`));
        }
      } else {
        reject(new Error(`Error ${code}: ${stderr}`));
      }
    });

    proc.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function convertSummariesToUiTestResults(
  summaries: Record<string, any>,
  key: string,
  defaults: { testSuiteName: string; individualTestName: string }
): UiTestResult[] {
  const results: UiTestResult[] = [];
  const metrics = summaries[key];

  if (!metrics) {
    throw new Error('Results not found');
  }

  const result = new UiTestResult();
  result.testSuiteName = metrics.testSuiteName || defaults.testSuiteName;
  result.individualTestName =
    metrics.individualTestName || defaults.individualTestName;
  result.componentLoadTime = Math.round(metrics.componentLoadTime || 0);
  result.salesforceLoadTime = Math.round(metrics.salesforceLoadTime || 0);
  result.overallLoadTime = Math.round(metrics.overallLoadTime || 0);

  results.push(result);
  return results;
}
