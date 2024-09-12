/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { expect } from 'chai';
import { SalesforceConnection } from '../../../src/services/salesforce/connection';
import { AuthInfo } from '@salesforce/core';
import sinon from 'sinon';

describe('Deploy', () => {
  it('should create new class', async () => {
    const tooling = new FakeTooling([]);
    const connection = await createConnection(tooling);

    await connection.replaceClasses(new Map([['Foo', 'public class Foo {}']]));
    expect(tooling.deletedIds).to.deep.equal([]);
    expect(tooling.created).to.deep.equal([
      {
        name: 'Foo',
        body: 'public class Foo {}',
      },
    ]);
  });

  it('should create multiple new classes', async () => {
    const tooling = new FakeTooling([]);
    const connection = await createConnection(tooling);

    await connection.replaceClasses(
      new Map([
        ['Foo', 'public class Foo {}'],
        ['Bar', 'public class Bar {}'],
      ])
    );
    expect(tooling.deletedIds).to.deep.equal([]);
    expect(tooling.created).to.deep.equal([
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
    const tooling = new FakeTooling(['anId']);
    const connection = await createConnection(tooling);

    await connection.replaceClasses(new Map([['Foo', 'public class Foo {}']]));
    expect(tooling.deletedIds).to.deep.equal(['anId']);
    expect(tooling.created).to.deep.equal([
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

async function createConnection(
  tooling: FakeTooling
): Promise<SalesforceConnection> {
  const connection = new SalesforceConnection({
    authInfo: await AuthInfo.create({
      username: '00D000000000000!',
    }),
  });
  sinon.stub(connection, 'tooling').value(tooling);
  return connection;
}
