/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { promises as fs } from 'fs';

export const createDir = async (directoryName: string): Promise<string> =>
		exists(directoryName)
			.then((existsFolder: boolean ) => {
				if (!existsFolder) return directoryName;
				else throw {error: `Already exists ${directoryName}`};
			})
			.then((_directoryName: string) => mkdirCustomMode(_directoryName))
			.then(() => directoryName);

const exists = async (directoryName: string) => {
	try {
		await fs.stat(directoryName);
	} catch (e) {
		return false;
	}
	return true;
};

const mkdirWrapper =  ( fileMode: string ) => async ( directoryName: string) => fs.mkdir(directoryName, fileMode);
const mkdirCustomMode = mkdirWrapper('0766');
