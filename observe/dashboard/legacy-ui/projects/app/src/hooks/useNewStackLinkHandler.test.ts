import { AnalysisMetric } from 'generated/graphql';
import { NEW_STACK_BACK_TO_KEY } from 'types/navTags';
import {
  getNewStackEmbeddedURL,
  getNewStackURL,
  mountIndividualProfileTimeseriesDashboardUrl,
  NewStackPath,
} from './useNewStackLinkHandler';

const currentUrl = encodeURIComponent(window.location.href);

describe('useNewStackLinkHandler', () => {
  describe('getNewStackURL', () => {
    it.each(['org-0', 'org-2'])('should return the correct url for org %p', (orgId) => {
      const url = getNewStackURL({ orgId });
      expect(url).toEqual(`http://localhost/${orgId}?${NEW_STACK_BACK_TO_KEY}=${currentUrl}`);
    });

    it.each([new URLSearchParams({ foo: 'bar' }), new URLSearchParams({ lorem: 'ipsum', other: 'something' })])(
      'should return the correct url with search params %p',
      (searchParams) => {
        const url = getNewStackURL({
          orgId: 'org-0',
          searchParams,
        });
        expect(url).toEqual(`http://localhost/org-0?${searchParams.toString()}&${NEW_STACK_BACK_TO_KEY}=${currentUrl}`);
      },
    );

    it.each(['event-feed', 'insights'])(`should return the correct url for path %p`, (path) => {
      const url = getNewStackURL({ orgId: 'org-0', path: path as NewStackPath });
      expect(url).toEqual(`http://localhost/org-0/${path}?${NEW_STACK_BACK_TO_KEY}=${currentUrl}`);
    });
  });

  describe('getNewStackEmbeddedURL', () => {
    it.each(['org-0', 'org-2'])('should return the correct url for org %p with embedded param', (orgId) => {
      const url = getNewStackEmbeddedURL({ orgId });
      expect(url).toEqual(`http://localhost/${orgId}?embedded=true&${NEW_STACK_BACK_TO_KEY}=${currentUrl}`);
    });

    it('should return the correct url using search params with embedded param', () => {
      const url = getNewStackEmbeddedURL({
        orgId: 'org-0',
        searchParams: new URLSearchParams({ lorem: 'ipsum', other: 'something' }),
      });
      expect(url).toEqual(
        `http://localhost/org-0?lorem=ipsum&other=something&embedded=true&${NEW_STACK_BACK_TO_KEY}=${currentUrl}`,
      );
    });

    it('should return the correct constraints url with embedded param', () => {
      const url = getNewStackEmbeddedURL({
        orgId: 'org-0',
        path: 'model-0/constraints',
      });
      expect(url).toEqual(
        `http://localhost/org-0/model-0/constraints?embedded=true&${NEW_STACK_BACK_TO_KEY}=${currentUrl}`,
      );
    });
  });

  describe('mountIndividualProfileTimeseriesDashboardUrl', () => {
    const originalLocation = { ...window.location };
    beforeEach(() => {
      // @ts-expect-error - we're mocking window.location
      delete window.location;
      window.location = { ...originalLocation, search: '?targetOrgId=org-test' };
    });

    it('test without search params', () => {
      const url = mountIndividualProfileTimeseriesDashboardUrl({ resourceId: 'model-123', orgId: 'org-test' });
      expect(url).toEqual(`http://localhost/org-test/model-123/single-profile?${NEW_STACK_BACK_TO_KEY}=${currentUrl}`);
    });

    it('test with search params', () => {
      const url = mountIndividualProfileTimeseriesDashboardUrl({
        resourceId: 'model-111',
        column: 'foo-column',
        metric: AnalysisMetric.Median,
        orgId: 'org-test',
      });
      expect(url).toEqual(
        `http://localhost/org-test/model-111/single-profile?column=foo-column&metric=MEDIAN&${NEW_STACK_BACK_TO_KEY}=${currentUrl}`,
      );
    });

    it('test with search params and date range', () => {
      const url = mountIndividualProfileTimeseriesDashboardUrl({
        resourceId: 'model-111',
        column: 'foo-column',
        metric: AnalysisMetric.Median,
        datePickerSearchString: 'startDate=2023-12-12&endDate=2023-12-24',
        orgId: 'org-test',
      });
      expect(url).toEqual(
        `http://localhost/org-test/model-111/single-profile?column=foo-column&metric=MEDIAN&${NEW_STACK_BACK_TO_KEY}=${currentUrl}&startDate=2023-12-12&endDate=2023-12-24`,
      );
    });
  });
});
