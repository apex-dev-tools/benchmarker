/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

// import { DataSource } from "typeorm";
import type { PostgresCommonDataMapper } from "./interop.js";
import { PostgresDataSource, type PostgresOptions } from "./postgres.js";

export class MainDataSource extends PostgresDataSource {
  mapper?: PostgresCommonDataMapper; // TODO actual type

  get isActive(): boolean {
    return this.mapper != null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async connect(options: PostgresOptions = {}): Promise<void> {
    if (this.mapper) return;

    this.options = options;

    const credentials = this.resolveCredentials();
    if (!credentials) return;

    // TODO create mapper
  }
}
