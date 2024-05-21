/** @ignore */
/**
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Entity, Column } from 'typeorm';
import { PerformanceBaseEntity } from './base';
import { Org } from '../../services/org/context';

@Entity({ name: 'org_info' })
export class OrgInfo extends PerformanceBaseEntity {
  [key: string]:
    | number
    | string
    | Date
    | boolean
    | undefined
    | (() => string)
    | ((orgInfo: Org) => void);

  @Column('text', { nullable: true, name: 'org_id' })
  public orgId = '';

  @Column('text', { nullable: true, name: 'release_version' })
  public releaseVersion = '';

  @Column('text', { nullable: true, name: 'api_version' })
  public apiVersion = '';

  @Column('text', { nullable: true, name: 'org_type' })
  public orgType = '';

  @Column('text', { nullable: true })
  public instance = '';

  @Column('boolean', { nullable: true, name: 'is_lex' })
  public isLex = false;

  @Column('boolean', { nullable: true, name: 'is_multicurrency' })
  public isMulticurrency = false;

  @Column('boolean', { nullable: true, name: 'is_sandbox' })
  public isSandbox = false;

  @Column('boolean', { nullable: true, name: 'is_trial' })
  public isTrial = false;

  public constructor() {
    super();
  }

  public fillOrgContextInformation(orgInfo: Org) {
    this.orgId = orgInfo.orgID;
    this.releaseVersion = orgInfo.releaseVersion;
    this.apiVersion = orgInfo.apiVersion;
    this.orgType = orgInfo.orgType;
    this.instance = orgInfo.orgInstance;
    this.isLex = orgInfo.isLex;
    this.isMulticurrency = orgInfo.isMulticurrency;
    this.isSandbox = orgInfo.isSandbox;
    this.isTrial = orgInfo.isTrial;
  }
}
