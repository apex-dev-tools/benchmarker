/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { chunk, cloneDeep } from 'lodash';
import { Timer } from '../../shared/timer';
import { delay } from '../../shared/uiHelper';
import {
  BULK_API_DEFAULT_CHUNK_SIZE,
  BULK_API_INSERT_OPERATION,
  ERROR_DUPLICATE_VALUE,
} from '../../shared/constants';
import { replaceNamespace, sobject } from './utils';
import { SalesforceConnection } from './connection';
import { generateRecordsWithCSVData } from '../filesystem';
import {
  Job,
  BulkOperation,
  Batch,
  BulkQueryBatchResult,
  BulkIngestBatchResult,
} from '@jsforce/jsforce-node/lib/api/bulk';
import { Schema } from '@jsforce/jsforce-node';

/**
 * Deletes SObject records filter by a field with its value
 * @param connection object to handle the connection to a Salesforce Org
 * @param object SObject API name
 * @param whereField field to be filter for
 * @param whereValue value to be filter for
 * * @example
 * ```typescript
 *  await deleteRecords(connectionData, 'Account', 'Name', 'My Account');
 * ```
 */
export async function deleteRecords(
  connection: SalesforceConnection,
  object: string,
  whereField: string,
  whereValue: string
) {
  return sobject(connection, object)
    .find({
      [whereField]: [whereValue],
    })
    .destroy();
}

/**
 * Deletes SObject records in bulk given an External Id
 * @param connection object to handle the connection to a Salesforce Org
 * @param externalIDs external Ids of the records to be deleted
 * @param objectApiName SObject API name
 * @param externalIdApiName API name for the external Id field
 * @param chunkSize number of records to be deleted in each batch, by default is 2000
 * * @example
 * ```typescript
 *  await deleteGenericRecordsByExternalIDs(connection, ['ExtId__1', 'ExtId__2'], 'Account', 'ExternalId__c', 50);
 * ```
 */
export async function deleteGenericRecordsByExternalIDs(
  connection: SalesforceConnection,
  externalIDs: string[],
  objectApiName: string,
  externalIdApiName: string,
  chunkSize: number
) {
  try {
    const promisesArray: Array<Promise<any>> = chunk(
      externalIDs,
      chunkSize
    ).map((externalIdsChunk: string[]) => {
      return deleteBulkRecords(
        connection,
        replaceNamespace(objectApiName),
        `${replaceNamespace(externalIdApiName)} IN ('${externalIdsChunk.join(
          "','"
        )}')`
      );
    });
    await Promise.all(promisesArray);
  } catch (e) {
    console.log('Error produced while data destruction: ' + e);
  }
}
/**
 * Creates an object record in an org
 * @param connection object to handle the connection to a Salesforce Org
 * @param object SObject API name
 * @param fields fields to set when creating the record
 * * @example
 * ```typescript
 * const product = await createSobjectRecord(connectionData, 'Product2', {['Name']: 'My Product', ['Description']: 'My Product description'});
 * ```
 */
export async function createSobjectRecord(
  connection: SalesforceConnection,
  object: string,
  fields: any
) {
  return sobject(connection, object).create(fields);
}
/**
 *  Gets single SObject record filter by a field with its value
 * @param connection object to handle the connection to a Salesforce Org
 * @param object SObject API name
 * @param fields fields to retrieve
 * * @example
 * ```typescript
 * const account = await getSobjectRecord(connection, 'Account', {['Name']: 'My Account'});
 * ```
 */
export async function getSobjectRecord(
  connection: SalesforceConnection,
  object: string,
  fields: any
) {
  return sobject(connection, object).findOne(fields, { Id: 1, Name: 1 });
}
/**
 * Gets multiple SObject records filter by a field with its value ?
 * @param connection object to handle the connection to a Salesforce Org
 * @param object SObject API name
 * @param fields fields to retrieve
 * @example
 * ```typescript
 * const accounts = await getSobjectRecord(connection, 'Account', {['Account Currency']: 'EUR'});
 * ```
 */
export async function getSobjectRecords(
  connection: SalesforceConnection,
  object: string,
  fields: any
) {
  return sobject(connection, object).find(fields, { Id: 1, Name: 1 });
}
/**
 * Creates SObject records in bulk from a csv file
 * @param connection object to handle the connection to a Salesforce Org
 * @param properties object that wraps the configuration to create the objects in bulk
 * @param chunkSize number of records to be created in each batch, by default is 2000
 * @example
 * ```typescript
 * //Creates 1000 Opportunities with 2000 OpportunityLineItems each
 * let createdOppExternalIDs:string[] = [];
 * const opportunityExternalIDs: string[] = await bulkInsert(connection, {nItems: 1000, csvPath: 'scenarios/product/generic-csv-data/opportunities.csv', objectApiName: 'Opportunity', externalIdPrefix: 'Opp__'}, 200);
 * createdOppExternalIDs = createdOppExternalIDs.concat(opportunityExternalIDs);
 * await bulkInsert(connection, {nItems: 2000, parentExternalIds: opportunityExternalIDs, csvPath: 'scenarios/product/generic-csv-data/opportunitiesLines.csv', objectApiName: 'OpportunityLineItem', externalIdPrefix: ''}, 300);
 * ```
 */
export async function bulkInsert(
  connection: SalesforceConnection,
  properties: {
    nItems: number;
    parentExternalIds?: string[];
    csvPath: string;
    objectApiName: string;
    externalIdPrefix: string;
  },
  chunkSize: number = BULK_API_DEFAULT_CHUNK_SIZE
): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    let objectRecordsArray: Array<{ [key: string]: string }>;
    let generatedExternalIDs: string[];
    properties.objectApiName = replaceNamespace(properties.objectApiName);
    if (properties.parentExternalIds) {
      objectRecordsArray = generateRecordsWithCSVData(
        properties.csvPath,
        properties.parentExternalIds,
        properties.nItems
      );
    } else {
      generatedExternalIDs = generateExternalIds(
        properties.nItems,
        properties.externalIdPrefix
      );
      objectRecordsArray = generateRecordsWithCSVData(
        properties.csvPath,
        generatedExternalIDs
      );
    }
    console.info(
      `Starting data creation for ${properties.nItems} ${properties.objectApiName}`
    );
    try {
      const timer: Timer = Timer.create([
        { label: 'Measure-data-creation' },
      ])[0];
      timer.start();
      const batchResults = await insertDataWithBatches(
        connection,
        properties.objectApiName,
        BULK_API_INSERT_OPERATION,
        objectRecordsArray,
        chunkSize
      );
      timer.end();
      if (batchResults.some(batchResult => batchResult.failed)) {
        const errorResult = batchResults
          .filter(batchResult => batchResult.failed)
          .reduce(
            (
              accumulator: string,
              element: { failed: boolean; errors: string[] }
            ) => {
              accumulator = accumulator + `\n  ${element.errors.join('/n')}`;
              return accumulator;
            },
            `Error occurred during the creation of ${properties.objectApiName}, errors: \n`
          );
        console.error(errorResult);
        reject(errorResult);
      } else {
        console.info(
          `Insertion operation for ${properties.nItems} ${
            properties.objectApiName
          } ended, time consumed: ${timer.getTime() / 1000} sec`
        );
        resolve(generatedExternalIDs!);
      }
    } catch (e) {
      reject(
        `${properties.objectApiName} error occurred during creation, message = ${e.message}`
      );
    }
  });
}
/**
 * Generates unique External Ids values given a prefix and the number of items
 * @param nItems number of items to generate
 * @param prefix identifying text for external ids
 * @example
 * ```typescript
 * const prefixes: string[] = generateExternalIds(10, 'ExtId');
 * ```
 */
export const generateExternalIds = (nItems: number, prefix: string) =>
  new Array(nItems)
    .fill(0)
    .map(() => prefix + Math.trunc(Math.random() * 1000000000));
const insertDataWithBatches = async (
  connection: SalesforceConnection,
  objectApiName: string,
  operation: BulkOperation,
  records: any[],
  chunkSize: number
): Promise<Array<{ failed: boolean; errors: string[] }>> => {
  connection.bulk.pollTimeout = 300000;
  const job = connection.bulk.createJob(objectApiName, operation);
  const allBatchesPromises = chunk(records, chunkSize)
    .map(chunkedData => insertChunk(job, chunkedData))
    .map(batchInfo =>
      getBulkBatchResults(job, batchInfo).then(batchResults =>
        getBulkBatchExecution(batchResults as BulkIngestBatchResult)
      )
    );
  const batchExecutionResults = await Promise.all(allBatchesPromises);
  await job.close();
  return batchExecutionResults;
};
const insertChunk = (job: Job<Schema, BulkOperation>, chunkedData: any[]) => {
  let batchJob = job.createBatch();
  return (batchJob = batchJob.execute(chunkedData));
};
function getBulkBatchExecution(batchResults: BulkIngestBatchResult): {
  failed: boolean;
  errors: string[];
} {
  const results: { failed: boolean; errors: string[] } = batchResults.reduce(
    (
      accumulator: { failed: boolean; errors: string[] },
      element: {
        success: boolean;
        errors: string[];
      }
    ) => {
      if (!element.success && element.errors) {
        accumulator = cloneDeep(accumulator);
        accumulator.failed = true;
        let errorMessage: string = element.errors.join(', ');
        if (errorMessage.includes(ERROR_DUPLICATE_VALUE)) {
          errorMessage = 'Data already exists';
        }
        accumulator.errors.push(errorMessage);
      }
      return accumulator;
    },
    { failed: false, errors: [''] }
  );
  return results;
}
async function getBulkBatchResults(
  job: Job<Schema, BulkOperation>,
  batchItem: Batch<Schema, BulkOperation>,
  timeToRetry: number = 1000,
  maxAttempts: number = 99999999999,
  currentAttempt: number = 0
): Promise<BulkQueryBatchResult | BulkIngestBatchResult> {
  return new Promise<any>(async (resolve, reject) => {
    try {
      resolve(await checkBatchStatus(job, batchItem));
    } catch (err) {
      if (currentAttempt < maxAttempts) {
        await delay(timeToRetry);
        try {
          resolve(
            await getBulkBatchResults(
              job,
              batchItem,
              timeToRetry,
              maxAttempts,
              ++currentAttempt
            )
          );
        } catch (e) {
          reject('Error getting batch job results, error: ' + e.message);
        }
      } else {
        reject('Batch job not completed, max attempts reached');
      }
    }
  });
}
async function checkBatchStatus(
  job: Job<Schema, BulkOperation>,
  batchItem: Batch<Schema, BulkOperation>
): Promise<BulkQueryBatchResult | BulkIngestBatchResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const jobStatus = await job.check();
      const batchStatus = await batchItem.check();
      if (
        (batchStatus && batchStatus.state === 'Completed') ||
        (jobStatus && jobStatus.state === 'Closed')
      ) {
        const batchResults: BulkQueryBatchResult | BulkIngestBatchResult =
          await batchItem.retrieve();
        resolve(batchResults);
      } else {
        reject('Batch job error, batch job status is not Complete/Closed');
      }
    } catch (e) {
      reject('Error checking batch job status, error: ' + e.message);
    }
  });
}
async function deleteBulkRecords(
  connection: SalesforceConnection,
  object: string,
  whereCondicion: string
) {
  try {
    await sobject(connection, object).select().where(whereCondicion).destroy();
  } catch (e) {
    console.log('Error produced while data destruction: ' + e);
  }
}
