/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { getUnmanagePackages } from '../../shared/env';

export const replaceNamespace = (text: string) => {
  let result = text;
  getUnmanagePackages().forEach(element => {
    result = element
      ? result.replace(new RegExp(element + '(__|.)', 'g'), '')
      : result;
  });
  return result;
};
