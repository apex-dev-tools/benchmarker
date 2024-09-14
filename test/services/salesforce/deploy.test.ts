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

  it('should handle query failure with retry', async () => {
    const tooling = new FakeTooling([], {
      query: 1,
      create: 0,
      delete: 0,
    });
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

  it('should handle create failure with retry', async () => {
    const tooling = new FakeTooling([], {
      query: 0,
      create: 1,
      delete: 0,
    });
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

  it('should handle delete failure with retry', async () => {
    const tooling = new FakeTooling([], {
      query: 0,
      create: 0,
      delete: 1,
    });
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

  it('should error on too many failures', async () => {
    const tooling = new FakeTooling([], {
      query: 0,
      create: 4,
      delete: 0,
    });
    const connection = await createConnection(tooling);

    try {
      await connection.replaceClasses(
        new Map([['Foo', 'public class Foo {}']])
      );
      expect.fail();
    } catch (e) {
      expect(e).to.be.instanceof(Error);
      expect((e as Error).message).to.contains(
        'Failed to execute function after 3 attempts.'
      );
    }
    return Promise.resolve();
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  async create(nameAndBody: NameAndBody): Promise<void> {
    if (this.failureCounts.create > 0) {
      this.failureCounts.create -= 1;
      throw new Error('Create failure');
    }

    this.created.push(nameAndBody);
  }

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
): Promise<SalesforceConnection> {
  const connection = new SalesforceConnection({
    authInfo: await AuthInfo.create({
      username: '00D000000000000!',
    }),
  });
  sinon.stub(connection, 'tooling').value(tooling);
  return connection;
}
