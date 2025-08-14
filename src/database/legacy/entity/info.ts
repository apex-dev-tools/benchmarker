/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import { Column, Entity } from "typeorm";
import { PerformanceBaseEntity } from "./base.js";

@Entity({ name: "test_info" })
export class TestInfo extends PerformanceBaseEntity {
  @Column("text", { nullable: true, name: "action" })
  public action!: string;

  @Column("text", { nullable: true, name: "flow_name" })
  public flowName!: string;

  @Column("text", { nullable: true, name: "product" })
  public product!: string;

  @Column("text", { nullable: true, name: "additional_data" })
  public additionalData!: string;
}
