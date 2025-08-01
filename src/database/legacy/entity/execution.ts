/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base.js';

@Entity({ name: 'execution_info' })
export class ExecutionInfo extends PerformanceBaseEntity {
  @Column('integer', { nullable: true, name: 'test_result_id' })
  public testResultId: number;

  @Column('integer', { nullable: true, name: 'org_info_id' })
  public orgInfoId: number;

  @Column('integer', { nullable: true, name: 'package_info_id' })
  public packageInfoId: number;

  @Column('text', { nullable: true, name: 'external_build_id' })
  public externalBuildId: string;
}
