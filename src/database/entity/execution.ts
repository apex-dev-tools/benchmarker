/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';
import { DEFAULT_NUMERIC_VALUE } from '../../shared/constants';

@Entity({ name: 'execution_info' })
export class ExecutionInfo extends PerformanceBaseEntity {
  [key: string]: number | string | Date | undefined;

  @Column('integer', { nullable: true, name: 'test_result_id' })
  public testResultId = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'org_info_id' })
  public orgInfoId = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'package_info_id' })
  public packageInfoId = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'alert_id' })
  public alertId = DEFAULT_NUMERIC_VALUE;

  @Column('text', { nullable: true, name: 'external_build_id' })
  public externalBuildId = '';
}
