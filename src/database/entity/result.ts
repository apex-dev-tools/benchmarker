/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */
import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';
import { DEFAULT_NUMERIC_VALUE } from '../../shared/constants';

@Entity({ name: 'test_result' })
export class TestResult extends PerformanceBaseEntity {
  [key: string]: number | string | Date | boolean | undefined;

  @Column('integer', { nullable: true })
  public duration = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'target_value' })
  public targetValue = DEFAULT_NUMERIC_VALUE;

  @Column('text', { nullable: true })
  public action = '';

  @Column('text', { nullable: true, name: 'flow_name' })
  public flowName = '';

  @Column('text', { nullable: true, name: 'error' })
  public error = '';

  @Column('text', { nullable: true })
  public product = '';

  @Column('boolean', { nullable: true, name: 'incognito_browser' })
  public incognitoBrowser = false;

  @Column('integer', { nullable: true, name: 'speed_index' })
  public lighthouseSpeedIndex = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'time_to_interactive' })
  public lighthouseTimeToInteractive = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'dlp_lines' })
  public dlpLines = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'dp_documents' })
  public dpDocuments = DEFAULT_NUMERIC_VALUE;

  @Column('text', { nullable: true, name: 'test_type' })
  public testType = '';

  @Column('integer', { nullable: true, name: 'cpu_time' })
  public cpuTime = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'dml_rows' })
  public dmlRows = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'dml_statements' })
  public dmlStatements = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'heap_size' })
  public heapSize = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'query_rows' })
  public queryRows = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'soql_queries' })
  public soqlQueries = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'queueable_jobs' })
  public queueableJobs = DEFAULT_NUMERIC_VALUE;

  @Column('integer', { nullable: true, name: 'future_calls' })
  public futureCalls = DEFAULT_NUMERIC_VALUE;

  public constructor() {
    super();
  }
}
