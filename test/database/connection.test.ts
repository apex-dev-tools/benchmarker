/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import * as chai from 'chai';
import { expect } from 'chai';
import { createStubInstance, SinonStub, stub, SinonStubbedInstance, restore } from 'sinon';
import * as env from '../../src/shared/env';
import sinonChai from 'sinon-chai';
import * as typeorm from 'typeorm';
import { Connection } from 'typeorm';
import { OrgInfo } from '../../src/database/entity/org';
import { TestResult } from '../../src/database/entity/result';
import { PackageInfo } from '../../src/database/entity/package';
import { ExecutionInfo } from '../../src/database/entity/execution';

chai.use(sinonChai);

describe('src/database/connection', () => {
	let connection: SinonStubbedInstance<Connection>;
	let getDatabaseUrl: SinonStub;
	let createConnection: SinonStub;

	beforeEach(() => {
		delete require.cache[require.resolve('../../src/database/connection')];

		connection = createStubInstance(Connection);
		getDatabaseUrl = stub(env, 'getDatabaseUrl');
		createConnection = stub(typeorm, 'createConnection');
	});

	afterEach(() => {
		restore();
	});

	describe('getConnection', () => {
		it('should lazy load', async () => {
			// Given
			getDatabaseUrl.returns('postgres://exampleUser:examplePassword@examplehost.com:1234/exampleDb');
			createConnection.resolves(connection);

			const { getConnection } = require('../../src/database/connection');

			// When
			const actual1 = await getConnection();
			const actual2 = await getConnection();

			// Then
			expect(actual1).to.eql(actual2);
			expect(createConnection).to.be.calledOnce;
		});

		it('should create a connection with sensible defaults', async () => {
			// Given
			getDatabaseUrl.returns('');
			createConnection.resolves(connection);

			const { getConnection } = require('../../src/database/connection');

			// When
			const actual = await getConnection();

			// Then
			expect(actual).to.be.ok;
			expect(createConnection).to.be.calledOnceWithExactly({
				type: 'postgres',
				entities: [TestResult, OrgInfo, PackageInfo, ExecutionInfo],
				schema: 'performance',
				synchronize: true,
				logging: false,
				host: 'localhost',
				port: 5432,
				username: '',
				password: '',
				database: '',
				ssl: false
			});
		});

		it('should create a connection with database url values', async () => {
			// Given
			getDatabaseUrl.returns('postgres://exampleUser:examplePassword@examplehost.com:1234/exampleDb');
			createConnection.resolves(connection);

			const { getConnection } = require('../../src/database/connection');

			// When
			const actual = await getConnection();

			// Then
			expect(actual).to.be.ok;
			expect(createConnection).to.be.calledOnceWithExactly({
				type: 'postgres',
				entities: [TestResult, OrgInfo, PackageInfo, ExecutionInfo],
				schema: 'performance',
				synchronize: true,
				logging: false,
				host: 'examplehost.com',
				port: '1234',
				username: 'exampleUser',
				password: 'examplePassword',
				database: 'exampleDb',
				ssl: {rejectUnauthorized: false }
			});
		});
	});
});
