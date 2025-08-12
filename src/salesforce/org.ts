/*
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

import type { Connection } from "@salesforce/core";
import {
  BenchmarkOrgConnection,
  connectToSalesforceOrg,
  type OrgAuthOptions,
} from "./org/connection.js";
import { getOrgContext, type OrgContext } from "./org/context.js";

export interface BenchmarkOrgOptions {
  // use existing connection to create internal one
  connection?: Connection;
  username?: string;
  password?: string;
  loginUrl?: string;
  version?: string;
  /**
   * List of namespaces to be removed from any Apex code.
   * Removes the need to make benchmark scripts for managed and unmanaged scenarios.
   * List of generated RegExp is available from the current org instance.
   */
  unmanagedNamespaces?: string[];
}

export class BenchmarkOrg {
  protected options: BenchmarkOrgOptions = {};
  protected orgConnection?: BenchmarkOrgConnection;
  protected context?: OrgContext;
  protected namespaces?: string[];
  protected namespaceRegExp?: RegExp[];

  get isConnected(): boolean {
    return this.orgConnection != null;
  }

  get connection(): BenchmarkOrgConnection {
    if (!this.orgConnection) {
      throw new Error("Org connection not yet established.");
    }
    return this.orgConnection;
  }

  /**
   * Sets connection from options or environment
   */
  async connect(options: BenchmarkOrgOptions = {}): Promise<void> {
    if (this.orgConnection) return;

    this.options = options;
    const auth = this.loadAuth();

    if (options.connection) {
      (await BenchmarkOrgConnection.create({
        authInfo: options.connection.getAuthInfo(),
      })) as BenchmarkOrgConnection;
    }

    if (auth) {
      this.orgConnection = await connectToSalesforceOrg(auth);
    }
  }

  async getContext(): Promise<OrgContext> {
    if (!this.context) {
      this.context = await getOrgContext(this.connection);
    }
    return this.context;
  }

  getUnmanagedNamespaces(): string[] {
    if (!this.namespaces) {
      this.namespaces =
        this.options.unmanagedNamespaces ||
        process.env.BENCH_ORG_UNMANAGED_NAMESPACES?.split(",") ||
        [];
    }
    return this.namespaces;
  }

  getNamespaceRegExp(): RegExp[] {
    if (!this.namespaceRegExp) {
      this.namespaceRegExp = this.getUnmanagedNamespaces().map(
        e => new RegExp(e + "(__|.)", "g")
      );
    }
    return this.namespaceRegExp;
  }

  removeUnmanagedNamespaces(text: string): string {
    return this.getNamespaceRegExp().reduce<string>(
      (str, regex) => str.replace(regex, ""),
      text
    );
  }

  protected loadAuth(): OrgAuthOptions | undefined {
    const { username, password, loginUrl, version } = this.options;

    const user = username || process.env.BENCH_ORG_USERNAME;

    if (user) {
      return {
        username: user,
        password: password || process.env.BENCH_ORG_PASSWORD,
        loginUrl: loginUrl || process.env.BENCH_ORG_LOGIN_URL,
        version,
      };
    }
    return undefined;
  }
}
