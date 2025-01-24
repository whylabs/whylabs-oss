import * as useDateRangeHook from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { ensureDateRangeIsAtLeastOneDay } from 'utils/queryUtils';

function mockImplementation(from = 1578268800000, to = 1578528000000): useDateRangeHook.SuperGlobalDateRange {
  return {
    dateRange: {
      from,
      to,
    },
    loading: false,
    appliedPreset: 'custom',
    setDatePickerRange: jest.fn(),
    openDatePicker: jest.fn(),
    dateRangeWithOneDayMinimumInterval: ensureDateRangeIsAtLeastOneDay({ from, to }),
    datePickerSearchString: '',
    isUsingFallbackRange: false,
    applyTrailingWindowRange: jest.fn(),
  };
}

export const mockUseGlobalDateRange = (from?: number, to?: number): jest.SpyInstance => {
  return jest.spyOn(useDateRangeHook, 'useSuperGlobalDateRange').mockImplementation(() => mockImplementation(from, to));
};
