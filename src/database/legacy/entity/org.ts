/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Column, Entity } from 'typeorm';
import { PerformanceBaseEntity } from './base.js';

@Entity({ name: 'org_info' })
export class OrgInfo extends PerformanceBaseEntity {
  @Column('text', { nullable: true, name: 'org_id' })
  public orgId: string;

  @Column('text', { nullable: true, name: 'release_version' })
  public releaseVersion: string;

  @Column('text', { nullable: true, name: 'api_version' })
  public apiVersion: string;

  @Column('text', { nullable: true, name: 'org_type' })
  public orgType: string;

  @Column('text', { nullable: true })
  public instance: string;

  @Column('boolean', { nullable: true, name: 'is_lex' })
  public isLex: boolean;

  @Column('boolean', { nullable: true, name: 'is_multicurrency' })
  public isMulticurrency: boolean;

  @Column('boolean', { nullable: true, name: 'is_sandbox' })
  public isSandbox: boolean;

  @Column('boolean', { nullable: true, name: 'is_trial' })
  public isTrial: boolean;
}
