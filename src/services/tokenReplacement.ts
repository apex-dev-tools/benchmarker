/** @ignore */
/**
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

export interface TokenReplacement {
  token: string;
  value: string;
}

export const replaceTokensInString = (
  originalText: string,
  tokenReplacementMap?: TokenReplacement[]
): string => {
  if (!tokenReplacementMap) return originalText;

  return tokenReplacementMap.reduce(
    (accumulated: string, tokenReplacement: TokenReplacement) => {
      const regExp = new RegExp(escapeRegExp(tokenReplacement.token), 'gi');
      return accumulated.replace(regExp, tokenReplacement.value);
    },
    originalText
  );
};

const escapeRegExp = (unescapedText: string) => {
  return unescapedText.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};
