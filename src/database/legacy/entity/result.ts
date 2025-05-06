/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */
import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';

@Entity({ name: 'test_result' })
export class TestResult extends PerformanceBaseEntity {
  @Column('integer', { nullable: true })
  public duration: number;

  @Column('integer', { nullable: true, name: 'target_value' })
  public targetValue: number;

  @Column('text', { nullable: true })
  public action: string;

  @Column('text', { nullable: true, name: 'flow_name' })
  public flowName: string;

  @Column('text', { nullable: true, name: 'error' })
  public error: string;

  @Column('text', { nullable: true })
  public product: string;

  @Column('boolean', { nullable: true, name: 'incognito_browser' })
  public incognitoBrowser: boolean;

  @Column('integer', { nullable: true, name: 'speed_index' })
  public lighthouseSpeedIndex: number;

  @Column('integer', { nullable: true, name: 'time_to_interactive' })
  public lighthouseTimeToInteractive: number;

  @Column('integer', { nullable: true, name: 'dlp_lines' })
  public dlpLines: number;

  @Column('integer', { nullable: true, name: 'dp_documents' })
  public dpDocuments: number;

  @Column('text', { nullable: true, name: 'test_type' })
  public testType: string;

  @Column('integer', { nullable: true, name: 'cpu_time' })
  public cpuTime: number;

  @Column('integer', { nullable: true, name: 'dml_rows' })
  public dmlRows: number;

  @Column('integer', { nullable: true, name: 'dml_statements' })
  public dmlStatements: number;

  @Column('integer', { nullable: true, name: 'heap_size' })
  public heapSize: number;

  @Column('integer', { nullable: true, name: 'query_rows' })
  public queryRows: number;

  @Column('integer', { nullable: true, name: 'soql_queries' })
  public soqlQueries: number;

  @Column('integer', { nullable: true, name: 'queueable_jobs' })
  public queueableJobs: number;

  @Column('integer', { nullable: true, name: 'future_calls' })
  public futureCalls: number;
}
