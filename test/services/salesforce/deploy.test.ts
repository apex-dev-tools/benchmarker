/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { SalesforceConnection } from '../../../src/services/salesforce/connection';
import { replaceClasses as replaceClassesTarget } from '../../../src/services/salesforce/deploy';
import { Connection } from '@salesforce/core';

describe('Deploy', () => {
  it('should create new class', async () => {
    const fake = new FakeConnection([]);
    const connection = fake as any as SalesforceConnection;
    await connection.replaceClasses(new Map([['Foo', 'public class Foo {}']]));
    expect(fake.tooling.deletedIds).to.deep.equal([]);
    expect(fake.tooling.created).to.deep.equal([
      {
        name: 'Foo',
        body: 'public class Foo {}',
      },
    ]);
  });

  it('should create multiple new classes', async () => {
    const fake = new FakeConnection([]);
    const connection = fake as any as SalesforceConnection;
    await connection.replaceClasses(
      new Map([
        ['Foo', 'public class Foo {}'],
        ['Bar', 'public class Bar {}'],
      ])
    );
    expect(fake.tooling.deletedIds).to.deep.equal([]);
    expect(fake.tooling.created).to.deep.equal([
      {
        name: 'Foo',
        body: 'public class Foo {}',
      },
      {
        name: 'Bar',
        body: 'public class Bar {}',
      },
    ]);
  });

  it('should replace an existing class', async () => {
    const fake = new FakeConnection(['anId']);
    const connection = fake as any as SalesforceConnection;
    await connection.replaceClasses(new Map([['Foo', 'public class Foo {}']]));
    expect(fake.tooling.deletedIds).to.deep.equal(['anId']);
    expect(fake.tooling.created).to.deep.equal([
      {
        name: 'Foo',
        body: 'public class Foo {}',
      },
    ]);
  });
});

interface NameAndBody {
  name: string;
  body: string;
}

class FakeTooling {
  public deletedIds: string[] = [];
  public created: NameAndBody[] = [];
  private existingClassIds: string[];

  constructor(existingClassIds: string[]) {
    this.existingClassIds = existingClassIds;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async query(soql: string): Promise<any> {
    const ids = this.existingClassIds.map(id => {
      return {
        Id: id,
      };
    });
    return { records: ids };
  }

  sobject(name: string): FakeTooling | null {
    if (name == 'ApexClass') return this;
    else return null;
  }

  async create(nameAndBody: NameAndBody): Promise<void> {
    this.created.push(nameAndBody);
  }

  async delete(id: string): Promise<void> {
    this.deletedIds.push(id);
  }
}

class FakeConnection {
  tooling: FakeTooling;

  constructor(existingClassIds: string[]) {
    this.tooling = new FakeTooling(existingClassIds);
  }

  replaceClasses(sources: Map<string, string>) {
    return replaceClassesTarget.apply(this as any as Connection, [sources]);
  }
}
