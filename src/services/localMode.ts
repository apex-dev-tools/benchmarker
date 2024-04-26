/** @ignore */
/**
 * Copyright (c) 2020FinancialForce.com, inc. All rights reserved.
 */

import { getDatabaseUrl } from '../shared/env';

export function runningOnLocalMode(): boolean {
	return getDatabaseUrl() === '';
}
