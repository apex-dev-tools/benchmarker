/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export class PerformanceBaseEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @CreateDateColumn({ name: 'create_date_time' })
  public createDateTime: Date;

  @UpdateDateColumn({ name: 'update_date_time' })
  public updateDateTime: Date;
}
