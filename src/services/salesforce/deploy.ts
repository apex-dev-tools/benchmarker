/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */
import { Connection } from '@salesforce/core';

// https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
declare module '@salesforce/core' {
  interface Connection {
    replaceClasses(sources: Map<string, string>): Promise<void>;
  }
}

/**
 * Replace Apex classes on org using tooling api. If the classes already exist
 * they will be deleted before deploying new ones. Exceptions are thrown on errors.
 * @param sources map of class name (without .cls suffix) to class bodies
 */
Connection.prototype.replaceClasses = replaceClasses;

export async function replaceClasses(
  this: Connection,
  sources: Map<string, string>
) {
  const tooling = this.tooling;

  const nameList = Array.from(sources.keys())
    .map(name => `'${name}'`)
    .join(', ');
  const existingClasses = await tooling.query(
    `Select Id From ApexClass where Name in (${nameList})`
  );
  const ids = existingClasses.records.map(r => r.Id) as string[];
  for (const id of ids) {
    await tooling.sobject('ApexClass').delete(id);
  }

  for (const name of sources.keys()) {
    const body = sources.get(name);
    await tooling.sobject('ApexClass').create({ name, body });
  }
}
