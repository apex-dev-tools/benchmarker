
/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import { stub, restore, SinonStub } from 'sinon';
import { promises } from 'fs';
import fs from 'fs';
import { saveFileIntoDir, generateRecordsWithCSVData, readFile } from '../../../src/services/filesystem/filesystem';
import { CSV_EID } from '../../../src/shared/constants';

chai.use(sinonChai);

describe('/src/services/filesystem', () => {

	afterEach(() => {
		restore();
	});

	describe('saveFileIntoDir', () => {

		it('Directory does not exist', async () => {
			// Given
			stub(promises, 'stat').rejects();
			const writeFile = stub(promises, 'writeFile').resolves();
			const mkdir: SinonStub = stub(promises, 'mkdir').resolves();

			// When
			const result = await saveFileIntoDir('myDir', 'myFile', 'content');

			// Then
			expect(mkdir).to.have.been.calledOnceWith('myDir', '0766');
			expect(writeFile).to.have.been.calledOnceWith('./myDir/myFile', 'content');
			expect(result);

		});

		it('Directory exists', async () => {
			// Given
			stub(promises, 'stat').resolves();
			const writeFile = stub(promises, 'writeFile').resolves();
			const mkdir: SinonStub = stub(promises, 'mkdir').resolves();

			// When
			const result = await saveFileIntoDir('myDir', 'myFile', 'content');

			// Then
			expect(mkdir.callCount).to.be.eq(0);
			expect(writeFile).to.have.been.calledOnceWith('./myDir/myFile', 'content');
			expect(result);
		});

		it('FileWrite fails', async () => {
			// Given
			stub(promises, 'stat').resolves();
			const writeFile = stub(promises, 'writeFile').rejects('Something bad happened');
			const mkdir: SinonStub = stub(promises, 'mkdir').resolves();

			// When
			const result = await saveFileIntoDir('myDir', 'myFile', 'content');

			// Then
			expect(mkdir.callCount).to.be.eq(0);
			expect(writeFile).to.have.been.calledOnceWith('./myDir/myFile', 'content');
			expect(result);
		});
	});

	describe('csv2Array', () => {

		it('reads csv file and returns an array with a given number of items', () => {
			const csvContent = `header1,header2,ExternalId\nvalueA1,valueA2,${CSV_EID}\nvalueB1,valueB2,${CSV_EID}`;
			stub(fs, 'readFileSync').returns(csvContent);

			const generatedRows = generateRecordsWithCSVData('path', ['EID1', 'EID2'], 10);

			expect(generatedRows.length).to.be.eq(20);
			expect(generatedRows[0]).to.be.deep.equal({ header1: 'valueA1', header2: 'valueA2', ExternalId: 'EID1' });
			expect(generatedRows[1]).to.be.deep.equal({ header1: 'valueB1', header2: 'valueB2', ExternalId: 'EID1' });
			expect(generatedRows[10]).to.be.deep.equal({ header1: 'valueA1', header2: 'valueA2', ExternalId: 'EID2' });
			expect(generatedRows[11]).to.be.deep.equal({ header1: 'valueB1', header2: 'valueB2', ExternalId: 'EID2' });
		});

		it('reads csv file and returns an array with default number of items', () => {
			const csvContent = `header1,header2,ExternalId\nvalueA1,valueA2,${CSV_EID}\nvalueB1,valueB2,${CSV_EID}`;
			stub(fs, 'readFileSync').returns(csvContent);

			const generatedRows = generateRecordsWithCSVData('path', ['EID1', 'EID2']);

			expect(generatedRows.length).to.be.eq(2);
			expect(generatedRows[0]).to.be.deep.equal({ header1: 'valueA1', header2: 'valueA2', ExternalId: 'EID1' });
			expect(generatedRows[1]).to.be.deep.equal({ header1: 'valueB1', header2: 'valueB2', ExternalId: 'EID2' });;
		});
	});

	describe('readFile', () => {
		it('returns file contents', async () => {
			stub(fs, 'readFile').yields(undefined, 'file content');

			const fileContent = await readFile('filepath');

			expect(fileContent).to.be.equal('file content');
		});

		it('throws an error when file is not found', async () => {
			stub(fs, 'readFile').yields('file not found', undefined);
			try {
				await readFile('filepath');
				expect.fail();
			} catch (e) {
				expect(e).to.be.equal('file not found');
			}
		});
	});
});
