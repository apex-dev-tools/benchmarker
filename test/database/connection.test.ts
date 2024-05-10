/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import * as chai from 'chai';
import { expect } from 'chai';
import { createStubInstance, SinonStub, stub, SinonStubbedInstance, restore } from 'sinon';
import * as env from '../../src/shared/env';
import sinonChai from 'sinon-chai';
import * as typeorm from 'typeorm';
import { DataSource } from 'typeorm';
import { OrgInfo } from '../../src/database/entity/org';
import { TestResult } from '../../src/database/entity/result';
import { PackageInfo } from '../../src/database/entity/package';
import { ExecutionInfo } from '../../src/database/entity/execution';

chai.use(sinonChai);

describe('src/database/connection', () => {
	let connection: SinonStubbedInstance<DataSource>;
	let getDatabaseUrl: SinonStub;
	let dataSourceStub: SinonStub;

	beforeEach(() => {
		delete require.cache[require.resolve('../../src/database/connection')];

		connection = createStubInstance(DataSource);
		getDatabaseUrl = stub(env, 'getDatabaseUrl');
		dataSourceStub = stub(typeorm, 'DataSource').returns(connection);
	});

	afterEach(() => {
		restore();
	});

	describe('getConnection', () => {
		it('should lazy load', async () => {
			// Given
			getDatabaseUrl.returns('postgres://exampleUser:examplePassword@examplehost.com:1234/exampleDb');
			connection.initialize.resolves(connection);

			const { getConnection } = require('../../src/database/connection');

			// When
			const actual1 = await getConnection();
			const actual2 = await getConnection();

			// Then
			expect(actual1).to.eql(actual2);
			expect(connection.initialize).to.be.calledOnce;
		});

		it('should create a connection with sensible defaults', async () => {
			// Given
			getDatabaseUrl.returns('');
			connection.initialize.resolves(connection);

			const { getConnection } = require('../../src/database/connection');

			// When
			const actual = await getConnection();

			// Then
			expect(actual).to.be.ok;
			expect(connection.initialize).to.be.calledOnce;
			expect(dataSourceStub).to.be.calledOnceWithExactly({
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
			connection.initialize.resolves(connection);

			const { getConnection } = require('../../src/database/connection');

			// When
			const actual = await getConnection();

			// Then
			expect(actual).to.be.ok;
			expect(connection.initialize).to.be.calledOnce;
			expect(dataSourceStub).to.be.calledOnceWithExactly({
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
