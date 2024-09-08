/**
 * Copyright (c) 2024 FinancialForce.com, inc. All rights reserved.
 */

import {
  TransactionTestTemplate,
  TransactionProcess,
  SalesforceConnection,
} from '../src/';
import { expect } from 'chai';

describe('System Test Process', () => {
  let test: TransactionTestTemplate;

  before(async function () {
    test = await TransactionProcess.build('MockProduct');
  });

  describe('Deploy', function () {
    before(async function () {
      await deleteClasses(test.connection, ['Foo', 'Bar']);
    });

    it('should create new class', async () => {
      await test.connection.replaceClasses(
        new Map([['Foo', 'public class Foo {}']])
      );

      const existingClasses = await test.connection.tooling.query(
        "Select Id From ApexClass where Name in ('Foo')"
      );
      expect(existingClasses.records.length).to.be.equal(1);
    });

    it('should create multiple new classes', async () => {
      await test.connection.replaceClasses(
        new Map([
          ['Foo', 'public class Foo {}'],
          ['Bar', 'public class Bar {}'],
        ])
      );

      const existingClasses = await test.connection.tooling.query(
        "Select Id From ApexClass where Name in ('Foo', 'Bar')"
      );
      expect(existingClasses.records.length).to.be.equal(2);
    });

    it('should replace an existing class', async () => {
      await test.connection.replaceClasses(
        new Map([['Foo', 'public class Foo {}']])
      );

      await test.connection.replaceClasses(
        new Map([['Foo', 'global class Foo {}']])
      );

      const existingClasses = await test.connection.tooling.query(
        "Select Id, Body From ApexClass where Name in ('Foo')"
      );
      expect(existingClasses.records.length).to.be.equal(1);
      expect(existingClasses.records[0].Body).to.be.equal(
        'global class Foo {}'
      );
    });
  });
});

async function deleteClasses(
  connection: SalesforceConnection,
  sources: string[]
): Promise<void> {
  const tooling = connection.tooling;
  const nameList = Array.from(sources.keys())
    .map(name => `'${name}'`)
    .join(', ');
  const existingClasses = await tooling.query(
    `Select Id From ApexClass where Name in (${nameList})`
  );
  const ids = existingClasses.records.map(r => r.Id) as string[];
  for (const id of ids) {
    await tooling.sobject('ApexClass').delete(id);
  }
}
