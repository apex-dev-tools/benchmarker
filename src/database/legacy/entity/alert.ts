/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';

@Entity({ name: 'alert' })
export class Alert extends PerformanceBaseEntity {
  @Column('integer', { nullable: true, name: 'test_result_id' })
  public testResultId: number;

  @Column('text', { nullable: true, name: 'action' })
  public action: string;

  @Column('text', { nullable: true, name: 'flow_name' })
  public flowName: string;

  @Column('integer', { nullable: true, name: 'cpu_time_degraded' })
  public cpuTimeDegraded: number;

  @Column('integer', { nullable: true, name: 'dml_rows_degraded' })
  public dmlRowsDegraded: number;

  @Column('integer', { nullable: true, name: 'dml_statements_degraded' })
  public dmlStatementsDegraded: number;

  @Column('integer', { nullable: true, name: 'heap_size_degraded' })
  public heapSizeDegraded: number;

  @Column('integer', { nullable: true, name: 'query_rows_degraded' })
  public queryRowsDegraded: number;

  @Column('integer', { nullable: true, name: 'soql_queries_degraded' })
  public soqlQueriesDegraded: number;
}
