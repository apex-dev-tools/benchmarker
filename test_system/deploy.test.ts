/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { loadEnv, restore } from './helper.js';
import {
  BenchmarkOrgConnection,
  connectToSalesforceOrg,
} from '../src/salesforce/org/connection.js';

describe('deploy', () => {
  let connection: BenchmarkOrgConnection;

  before(async () => {
    restore();
    loadEnv();
    connection = await connectToSalesforceOrg({
      username: process.env.BENCH_ORG_USERNAME || 'bench_testing',
    });

    await deleteClasses(connection, ['Foo', 'Bar']);
  });

  it('should create new class', async () => {
    await connection.replaceClasses(new Map([['Foo', 'public class Foo {}']]));

    const existingClasses = await connection.tooling.query(
      "Select Id From ApexClass where Name in ('Foo')"
    );
    expect(existingClasses.records.length).to.be.equal(1);
  });

  it('should create multiple new classes', async () => {
    await connection.replaceClasses(
      new Map([
        ['Foo', 'public class Foo {}'],
        ['Bar', 'public class Bar {}'],
      ])
    );

    const existingClasses = await connection.tooling.query(
      "Select Id From ApexClass where Name in ('Foo', 'Bar')"
    );
    expect(existingClasses.records.length).to.be.equal(2);
  });

  it('should replace an existing class', async () => {
    await connection.replaceClasses(new Map([['Foo', 'public class Foo {}']]));

    await connection.replaceClasses(new Map([['Foo', 'global class Foo {}']]));

    const existingClasses = await connection.tooling.query(
      "Select Id, Body From ApexClass where Name in ('Foo')"
    );
    expect(existingClasses.records.length).to.be.equal(1);
    expect(existingClasses.records[0].Body).to.be.equal('global class Foo {}');
  });
});

async function deleteClasses(
  connection: BenchmarkOrgConnection,
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
