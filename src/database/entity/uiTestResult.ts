/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';
import {
  DEFAULT_NUMERIC_VALUE,
  DEFAULT_STRING_VALUE,
} from '../../shared/constants';

@Entity({ name: 'ui_test_result' })
export class UiTestResult extends PerformanceBaseEntity {
  [key: string]: number | string | Date | boolean | undefined;

  @Column('text', { nullable: true, name: 'test_suite_name' })
  public testSuiteName = DEFAULT_STRING_VALUE;

  @Column('text', { nullable: true, name: 'individual_test_name' })
  public individualTestName = DEFAULT_STRING_VALUE;

  @Column('integer', { nullable: true, name: 'component_load_time' })
  public componentLoadTime = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'salesforce_load_time' })
  public salesforceLoadTime = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'overall_load_time' })
  public overallLoadTime = DEFAULT_NUMERIC_VALUE;

  public constructor() {
    super();
  }
}
