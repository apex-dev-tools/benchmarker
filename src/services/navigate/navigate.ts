/** @ignore */
/**
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */
import { navigate as lexNavigator} from './lex';
import { navigate as classicNavigator} from './classic';
import { INavigate } from './types';
import { getIsLex } from '../orgContext/helper';
import { SalesforceConnection } from '../salesforce/connection';

export async function getNavigation(connection: SalesforceConnection): Promise<INavigate> {

	const isLex: boolean = await getIsLex(connection);

	return isLex ? lexNavigator : classicNavigator;
}
