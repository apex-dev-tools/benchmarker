/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { promises as fsPromise } from 'fs';
import * as fs from 'fs';
import { CSV_EID } from '../shared/constants';
import { replaceNamespace } from './salesforce/utils';

/** @ignore */
export const saveFileIntoDir = async (
  directoryName: string,
  fileName: string,
  fileContent: string
): Promise<boolean> => {
  try {
    const path = `./${directoryName}`;
    await createDir(directoryName)
      .then((result: string) => {
        console.log(`${result} directory created`);
      })
      .catch(err => {
        console.log(`Directory not created : ${JSON.stringify(err)}`);
      });

    await fsPromise.writeFile(`${path}/${fileName}`, fileContent);
    return true;
  } catch (err) {
    console.log(`Exception in saveFileIntoDir ${JSON.stringify(err)}`);
    return false;
  }
};

/** @ignore */
export function generateRecordsWithCSVData(
  csvPath: string,
  externalIDs: string[],
  itemNumerPerExternalId: number = 1
): Array<{ [key: string]: string }> {
  const items = [];
  const dataset = csv2Array(csvPath);
  let csvHeaderItems = dataset.shift()!.split(',');
  csvHeaderItems = replaceNamespaceHeaders(csvHeaderItems);
  let iteratorCSVRows = 0;

  for (const eid of externalIDs) {
    for (let i = 0; i < itemNumerPerExternalId; i++) {
      const propertiesArray = dataset[iteratorCSVRows].split(',');
      const item: { [key: string]: string } = {};
      for (let j = 0; j < csvHeaderItems.length; j++) {
        if (propertiesArray[j].trim() === CSV_EID) {
          propertiesArray[j] = eid;
        }
        item[`${csvHeaderItems[j].trim()}`] = propertiesArray[j];
      }
      items.push(item);

      if (iteratorCSVRows++ === dataset.length - 1) {
        iteratorCSVRows = 0;
      }
    }
  }
  return items;
}

/** @ignore */
const csv2Array = (csvPath: string) =>
  fs.readFileSync(csvPath, 'utf-8').split('\n');

/** @ignore */
const replaceNamespaceHeaders = (apexCode: string[]) =>
  apexCode.map(x => replaceNamespace(x));

// Workaround because fs.promise doesn't work for some people.
/**
 * Read the content of a file given its path
 * @param apexFilePath path for the Apex file
 */
export const readFile = async (apexFilePath: string): Promise<string> => {
  const file: Buffer = await new Promise((resolve, reject) => {
    fs.readFile(apexFilePath, (error, data) => {
      if (error) return reject(error);
      resolve(data);
    });
  });
  return file.toString();
};

const createDir = async (directoryName: string): Promise<string> =>
  exists(directoryName)
    .then((existsFolder: boolean) => {
      if (!existsFolder) return directoryName;
      else throw { error: `Already exists ${directoryName}` };
    })
    .then((_directoryName: string) => mkdirCustomMode(_directoryName))
    .then(() => directoryName);

const exists = async (directoryName: string) => {
  try {
    await fsPromise.stat(directoryName);
  } catch (e) {
    return false;
  }
  return true;
};

const mkdirWrapper = (fileMode: string) => async (directoryName: string) =>
  fsPromise.mkdir(directoryName, fileMode);
const mkdirCustomMode = mkdirWrapper('0766');
