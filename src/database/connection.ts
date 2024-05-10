/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */
import { parse } from 'pg-connection-string';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../shared/env';
import { OrgInfo } from './entity/org';
import { PackageInfo } from './entity/package';
import { TestResult } from './entity/result';
import { ExecutionInfo } from './entity/execution';

const DB_ENTITIES = [
	TestResult,
	OrgInfo,
	PackageInfo,
	ExecutionInfo
];

let connection: DataSource;

function parseDatabaseUrl() {
	const { host, port, user, password, database } = parse(getDatabaseUrl());
	return {
		host: host || 'localhost',
		port: port ? parseInt(port) : 5432,
		password: password || '',
		database: database || '',
		user: user || ''
	};
}

export async function getConnection() {
	if (!connection) {
		const { host, port, user, password, database } = parseDatabaseUrl();
		connection = await new DataSource({
			type: 'postgres',
			entities: DB_ENTITIES,
			schema: 'performance',
			synchronize: true,
			logging: false,
			host,
			port,
			username: user,
			password,
			database,
			ssl: host.includes('localhost') ? false : { rejectUnauthorized: false }
		}).initialize();
	}

	return connection;
}
