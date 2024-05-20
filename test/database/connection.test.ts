/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import pgstr from 'pg-connection-string';
import { DataSource } from 'typeorm';
import {
  resetConnection,
  getConnection,
  DB_ENTITIES,
} from '../../src/database/connection';

chai.use(sinonChai);

describe('src/database/connection', () => {
  let parseDatabaseUrlStub: SinonStub;
  let initializeStub: SinonStub;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    resetConnection();

    parseDatabaseUrlStub = sinon.stub(pgstr, 'parse').returns({
      host: null,
      database: null,
    });

    initializeStub = sinon
      .stub(DataSource.prototype, 'initialize')
      .resolvesThis();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getConnection', () => {
    it('should load connection url from env vars', async () => {
      // Given
      process.env.DATABASE_URL = 'test';

      // When
      const actual = await getConnection();

      // Then
      expect(actual).to.be.ok;
      expect(parseDatabaseUrlStub).to.be.calledOnceWithExactly('test');
      expect(initializeStub).to.be.calledOnce;
    });

    it('should lazy load', async () => {
      // Given
      // When
      const actual1 = await getConnection();
      const actual2 = await getConnection();

      // Then
      expect(actual1).to.eql(actual2);
      expect(initializeStub).to.be.calledOnce;
    });

    it('should reset connection', async () => {
      // Given
      // When
      const actual1 = await getConnection();
      resetConnection();

      parseDatabaseUrlStub.returns({
        host: 'example.com',
        database: null,
      });
      const actual2 = await getConnection();

      // Then
      expect(actual1).to.not.eql(actual2);
      expect(initializeStub).to.be.calledTwice;
    });

    it('should create a connection with sensible defaults', async () => {
      // Given
      // When
      const actual = await getConnection();

      // Then
      expect(actual).to.be.ok;
      expect(initializeStub).to.be.calledOnce;
      expect(actual.options).to.be.eql({
        type: 'postgres',
        entities: DB_ENTITIES,
        schema: 'performance',
        synchronize: true,
        logging: false,
        host: 'localhost',
        port: 5432,
        username: '',
        password: '',
        database: '',
        ssl: false,
      });
    });

    it('should create a connection with database url values', async () => {
      // Given
      parseDatabaseUrlStub.returns({
        database: 'exampleDb',
        host: 'examplehost.com',
        port: '1234',
        user: 'exampleUser',
        password: 'examplePassword',
      });

      // When
      const actual = await getConnection();

      // Then
      expect(actual).to.be.ok;
      expect(initializeStub).to.be.calledOnce;
      expect(actual.options).to.be.eql({
        type: 'postgres',
        entities: DB_ENTITIES,
        schema: 'performance',
        synchronize: true,
        logging: false,
        host: 'examplehost.com',
        port: 1234,
        username: 'exampleUser',
        password: 'examplePassword',
        database: 'exampleDb',
        ssl: { rejectUnauthorized: false },
      });
    });
  });
});
