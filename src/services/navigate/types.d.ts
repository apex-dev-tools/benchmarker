/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { ElementHandle, Frame, Page, HTTPResponse } from 'puppeteer';

export interface INavigateConfig {
	page: Page;
	doNavigate?: boolean;
	pageDomain?: string;
	title?: string;
}

export interface INavigate {
	goToAllTabsTab(config: INavigateConfig, tabName?: string, tabAttribute?: string): Promise<ElementHandle<Node> | null>;
	getVfFrame(config: INavigateConfig): Promise<Frame>;
	homeIsLoaded(config: INavigateConfig): Promise<ElementHandle | null>;
	goToFrontdoor(config: INavigateConfig, frontdoorUrl: string): Promise<HTTPResponse | null>;
}
