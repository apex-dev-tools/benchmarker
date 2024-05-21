/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';
import { DEFAULT_NUMERIC_VALUE } from '../../shared/constants';

@Entity({ name: 'package_info' })
export class PackageInfo extends PerformanceBaseEntity {
  [key: string]: number | string | Date | boolean | undefined | (() => string);

  @Column('text', { nullable: true, name: 'package_name' })
  public packageName = '';

  @Column('text', { nullable: true, name: 'package_version' })
  public packageVersion = '';

  @Column('text', { nullable: true, name: 'package_version_id' })
  public packageVersionId = '';

  @Column('text', { nullable: true, name: 'package_id' })
  public packageId = '';

  @Column('boolean', { nullable: true, name: 'is_beta' })
  public isBeta = false;

  @Column('integer', { nullable: true, name: 'beta_name' })
  public betaName = DEFAULT_NUMERIC_VALUE;

  public constructor() {
    super();
  }
}
