/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */
import { navigate as lexNavigator } from './navigate/lex';
import { navigate as classicNavigator } from './navigate/classic';
import { SalesforceConnection } from './salesforce/connection';
import { ElementHandle, Frame, Page, HTTPResponse } from 'puppeteer';
import { getIsLex } from './org/context';

export interface INavigateConfig {
  page: Page;
  doNavigate?: boolean;
  pageDomain?: string;
  title?: string;
}

export interface INavigate {
  goToAllTabsTab(
    config: INavigateConfig,
    tabName?: string,
    tabAttribute?: string
  ): Promise<ElementHandle<Node> | null>;
  getVfFrame(config: INavigateConfig): Promise<Frame>;
  homeIsLoaded(config: INavigateConfig): Promise<ElementHandle | null>;
  goToFrontdoor(
    config: INavigateConfig,
    frontdoorUrl: string
  ): Promise<HTTPResponse | null>;
}

export async function getNavigation(
  connection: SalesforceConnection
): Promise<INavigate> {
  const isLex: boolean = await getIsLex(connection);

  return isLex ? lexNavigator : classicNavigator;
}
