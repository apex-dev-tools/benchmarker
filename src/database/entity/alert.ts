/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';
import {
  DEFAULT_NUMERIC_VALUE,
  DEFAULT_STRING_VALUE,
} from '../../shared/constants';

@Entity({ name: 'alert' })
export class Alert extends PerformanceBaseEntity {
  [key: string]: number | string | Date | boolean | undefined;

  @Column('integer', { nullable: true, name: 'test_result_id' })
  public testResultId = DEFAULT_NUMERIC_VALUE;

  @Column('text', { nullable: true, name: 'action' })
  public action = DEFAULT_STRING_VALUE;

  @Column('text', { nullable: true, name: 'flow_name' })
  public flowName = DEFAULT_STRING_VALUE;

  @Column('integer', { nullable: true, name: 'cpu_time_degraded' })
  public cpuTimeDegraded = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'dml_rows_degraded' })
  public dmlRowsDegraded = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'dml_statements_degraded' })
  public dmlStatementsDegraded = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'heap_size_degraded' })
  public heapSizeDegraded = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'query_rows_degraded' })
  public queryRowsDegraded = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'soql_queries_degraded' })
  public soqlQueriesDegraded = DEFAULT_NUMERIC_VALUE;

  public constructor() {
    super();
  }
}
