/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import {
  replaceTokensInString,
  TokenReplacement,
} from '../../src/services/tokenReplacement';
import moment from 'moment';

describe('src/services/token-replacement', () => {
  describe('replaceTokensInString', () => {
    it('replace a single token', () => {
      const originalText = `line 1 with characters
			line 2 with a value %value1
			line 3 to finish
			%value1`;

      const tokenReplacementMap: TokenReplacement = {
        token: '%value1',
        value: 'it works!!!',
      };

      const finalText = replaceTokensInString(originalText, [
        tokenReplacementMap,
      ]);

      expect(finalText).to.contains('it works!!!');
      expect(finalText).to.not.contains('%value1');
    });

    it('replace a multiple token', () => {
      const originalText = `line 1 with characters
			line 2 with a value %value1
			line 3 to finish
			%value1
			line 4 %value2
			another new line
			and the end line %value2`;

      const tokenReplacementMap: TokenReplacement[] = [
        {
          token: '%value1',
          value: 'it works!!!',
        },
        {
          token: '%value2',
          value: 'and this too!',
        },
      ];

      const finalText = replaceTokensInString(
        originalText,
        tokenReplacementMap
      );

      expect(finalText).to.contains('it works!!!');
      expect(finalText).to.not.contains('%value1');

      expect(finalText).to.contains('and this too!');
      expect(finalText).to.not.contains('%value2');
    });

    it('Do not replace token', () => {
      const originalText = `line 1 with characters
			line 2 with a value %value1
			line 3 to finish
			%value1
			line 4 %value2
			another new line
			and the end line %value2`;

      const tokenReplacementMap: TokenReplacement[] = [];

      const finalText = replaceTokensInString(
        originalText,
        tokenReplacementMap
      );

      expect(finalText).to.not.contains('it works!!!');
      expect(finalText).to.contains('%value1');

      expect(finalText).to.not.contains('and this too!');
      expect(finalText).to.contains('%value2');
    });

    it('Replacement with special characters', () => {
      const originalText = `Contact resource = ResourceService.getResourceForCurrentUser();
			String resourceIdParam = String.valueOf(resource.Id);

			Date today = %System__.*today();
			System.debug('Replaced value ' + today);
			Date endDate = CalendarUtil.weekEndDateForWeekEndDay(today, 7);
			String weekEndDateParam = CalendarUtil.formatDate(endDate, 'MM/dd/yyyy');

			GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
			List<PSAScheduleGridService.Schedule> schedules = PSAScheduleGridController.readSchedules(weekEndDateParam, resourceIdParam);
			GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();
			GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);

			System.assertNotEquals(0, schedules.size(), 'expected to read some schedules');
			System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
			`;

      const tokenReplacementMap: TokenReplacement[] = [
        {
          token: '%System__.*today()',
          value: `date.parse('${moment().format('YYYY-MM-DD')}')`,
        },
      ];

      const finalText = replaceTokensInString(
        originalText,
        tokenReplacementMap
      );

      expect(finalText).to.not.contains('%System.today()');
      expect(finalText).to.not.contains(`${tokenReplacementMap[0].value}()`);
      expect(finalText).to.contains(`${tokenReplacementMap[0].value}`);
    });
  });
});
