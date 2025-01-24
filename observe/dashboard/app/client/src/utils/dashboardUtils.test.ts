import { dashboardNameForBreadcrumb } from './dashboardUtils';

describe('dashboardUtils', () => {
  describe('dashboardNameForBreadcrumb()', () => {
    it.each(['a short name', 'another sort name'])(
      'returns the input string %p when it is less than or equal to 32 characters',
      (input) => {
        const result = dashboardNameForBreadcrumb(input);
        expect(result).toEqual(input);
      },
    );

    it('returns a truncated string when the input is longer than 32 characters', () => {
      const input = 'a very long name that is over 32 characters';
      const result = dashboardNameForBreadcrumb(input);
      expect(result).toEqual('a very long name that is over 32…');
    });
  });
});
