/** @ignore */
/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */
import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';
import { DEFAULT_STRING_VALUE } from '../../shared/constants';

@Entity({ name: 'test_info' })
export class TestInfo extends PerformanceBaseEntity {
  [key: string]: number | string | Date | boolean | undefined;

  @Column('text', { nullable: true, name: 'action' })
  public action = DEFAULT_STRING_VALUE;

  @Column('text', { nullable: true, name: 'flow_name' })
  public flowName = DEFAULT_STRING_VALUE;

  @Column('text', { nullable: true, name: 'product' })
  public product = DEFAULT_STRING_VALUE;

  @Column('text', { nullable: true, name: 'additional_data' })
  public additionalData = DEFAULT_STRING_VALUE;

  public constructor() {
    super();
  }
}