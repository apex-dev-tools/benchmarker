/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import sinon from 'sinon';
import { expect } from 'chai';
import { AuthInfo } from '@salesforce/core';
import { BenchmarkOrgConnection } from '../../src/salesforce/org/connection';

describe('salesforce/deploy', () => {
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

interface FailureCounts {
  query: number;
  create: number;
  delete: number;
}

class FakeTooling {
  public deletedIds: string[] = [];
  public created: NameAndBody[] = [];
  private existingClassIds: string[];
  private failureCounts: FailureCounts;

  constructor(
    existingClassIds: string[],
    failureCounts: FailureCounts = { query: 0, create: 0, delete: 0 }
  ) {
    this.existingClassIds = existingClassIds;
    this.failureCounts = failureCounts;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  async query(soql: string): Promise<any> {
    if (this.failureCounts.query > 0) {
      this.failureCounts.query -= 1;
      throw new Error('Query failure');
    }
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async create(nameAndBody: NameAndBody): Promise<void> {
    if (this.failureCounts.create > 0) {
      this.failureCounts.create -= 1;
      throw new Error('Create failure');
    }

    this.created.push(nameAndBody);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(id: string): Promise<void> {
    if (this.failureCounts.delete > 0) {
      this.failureCounts.delete -= 1;
      throw new Error('Delete failure');
    }

    this.deletedIds.push(id);
  }
}

async function createConnection(
  tooling: FakeTooling
): Promise<BenchmarkOrgConnection> {
  const connection = new BenchmarkOrgConnection({
    authInfo: await AuthInfo.create({
      username: '00D000000000000!',
    }),
  });
  sinon.stub(connection, 'tooling').value(tooling);
  return connection;
}
