/*
 * Copyright (c) 2019 FinancialForce.com, inc. All rights reserved.
 */

import { Column, Entity } from "typeorm";
import { PerformanceBaseEntity } from "./base.js";

@Entity({ name: "package_info" })
export class PackageInfo extends PerformanceBaseEntity {
  @Column("text", { nullable: true, name: "package_name" })
  public packageName: string;

  @Column("text", { nullable: true, name: "package_version" })
  public packageVersion: string;

  @Column("text", { nullable: true, name: "package_version_id" })
  public packageVersionId: string;

  @Column("text", { nullable: true, name: "package_id" })
  public packageId: string;

  @Column("boolean", { nullable: true, name: "is_beta" })
  public isBeta: boolean;

  @Column("integer", { nullable: true, name: "beta_name" })
  public betaName: number;
}
