/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Stats } from 'node:fs';

export interface ApexDirectory {
  root: string;
  paths: string[];
}

interface PathDescription {
  absolutePath: string;
  stats: Stats;
}

export async function readApexFromFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, { encoding: 'utf8' });
}

export async function findApexInDir(dir: string): Promise<ApexDirectory> {
  const { absolutePath, stats } = await describePath(dir);

  if (!stats.isDirectory()) {
    throw new Error(`${absolutePath} is not a directory.`);
  }

  const entries = await fs.readdir(absolutePath, {
    withFileTypes: true,
    recursive: true,
  });

  const paths = entries
    .filter(ent => ent.isFile() && hasApexExt(ent.name))
    .map(e => path.join(e.parentPath, e.name));

  if (paths.length == 0) {
    throw new Error('No ".apex" files found, check path is correct.');
  }

  return {
    root: absolutePath,
    paths,
  };
}

export async function resolveApexPath(filePath: string): Promise<string> {
  const { absolutePath, stats } = await describePath(filePath);

  if (stats.isFile() && hasApexExt(absolutePath)) {
    return absolutePath;
  }
  throw new Error(`${absolutePath} is not an ".apex" file.`);
}

function hasApexExt(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.apex';
}

async function describePath(filePath: string): Promise<PathDescription> {
  const absolutePath = path.resolve(filePath);
  const stats = await fs.stat(absolutePath);
  return { absolutePath, stats };
}
