/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { SinonStub, stub, restore } from 'sinon';
import * as orgService from '../../src/services/org';
import * as resultService from '../../src/services/result';
import { expect } from 'chai';
import { TransactionTestTemplate } from '../../src/testTemplates/transactionTestTemplate';
import { saveResults } from '../../src/testTemplates/saveResult';
import { OrgContext } from '../../src/services/org/context';

describe('src/testTemplates/saveResult', () => {
  let reportResultsStub: SinonStub;

  beforeEach(() => {
    reportResultsStub = stub(resultService, 'reportResults').resolves();
    stub(orgService, 'getOrgContext').resolves({} as unknown as OrgContext);
  });

  describe('saveResults', () => {
    it('saves the passed results', async () => {
      const testTemplateStub = {} as TransactionTestTemplate;

      await saveResults(testTemplateStub, [
        {
          testStepDescription: {
            action: 'Mock action',
            flowName: 'Mock flow name',
          },
          result: {
            timer: 10,
            cpuTime: 5,
            dmlRows: 5,
            dmlStatements: 3,
            heapSize: 6,
            queryRows: 6,
            soqlQueries: 8,
          },
        },
      ]);

      expect(reportResultsStub.args[0][0][0].action).to.be.eql('Mock action');
      expect(reportResultsStub.args[0][0][0].flowName).to.be.eql(
        'Mock flow name'
      );
      expect(reportResultsStub.args[0][0].length).to.be.eql(1);
      expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.greaterThan(
        9
      );
      expect(reportResultsStub.args[0][0][0].cpuTime).to.be.equal(5);
      expect(reportResultsStub.args[0][0][0].dmlRows).to.be.equal(5);
      expect(reportResultsStub.args[0][0][0].dmlStatements).to.be.equal(3);
      expect(reportResultsStub.args[0][0][0].heapSize).to.be.equal(6);
      expect(reportResultsStub.args[0][0][0].queryRows).to.be.equal(6);
      expect(reportResultsStub.args[0][0][0].soqlQueries).to.be.equal(8);
    });

    it('saves results with error', async () => {
      const testTemplateStub = {} as TransactionTestTemplate;

      await saveResults(testTemplateStub, [
        {
          testStepDescription: {
            action: 'Mock action',
            flowName: 'Mock flow name',
          },
          result: {
            timer: 10,
            cpuTime: 5,
            dmlRows: 5,
            dmlStatements: 3,
            heapSize: 6,
            queryRows: 6,
            soqlQueries: 8,
          },
          error: 'Exception processing flow',
        },
      ]);

      expect(reportResultsStub.args[0][0][0].action).to.be.eql('Mock action');
      expect(reportResultsStub.args[0][0][0].flowName).to.be.eql(
        'Mock flow name'
      );
      expect(reportResultsStub.args[0][0].length).to.be.eql(1);
      expect(reportResultsStub.args[0][0][0].timer.getTime()).to.be.greaterThan(
        9
      );
      expect(reportResultsStub.args[0][0][0].cpuTime).to.be.equal(5);
      expect(reportResultsStub.args[0][0][0].dmlRows).to.be.equal(5);
      expect(reportResultsStub.args[0][0][0].dmlStatements).to.be.equal(3);
      expect(reportResultsStub.args[0][0][0].heapSize).to.be.equal(6);
      expect(reportResultsStub.args[0][0][0].queryRows).to.be.equal(6);
      expect(reportResultsStub.args[0][0][0].soqlQueries).to.be.equal(8);
      expect(reportResultsStub.args[0][0][0].error).to.be.equal(
        'Exception processing flow'
      );
    });
  });

  afterEach(() => {
    restore();
  });
});
