import { PageType, getAllPageTypes } from 'pages/page-types/pageType';
import * as usePageTypeWithParamsHook from 'pages/page-types/usePageType';
import { mockUseNavLinkHandler } from 'hooks/mocks/mockUseNavLinkHandler';

import { UniversalPageParams } from 'pages/page-types/pageUrlQuery';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { MockedProvider } from '@apollo/client/testing';
import Breadcrumb from '../Breadcrumb';

const { getByText, queryByText } = screen;

const NO_BREADCRUMB_PAGES: Set<PageType> = new Set(['notFound', 'globalSettings', 'dashboard', 'executive']);

const SETTINGS_PAGES: Set<PageType> = new Set([
  'modelSettings',
  'userSettings',
  'notifications',
  'accessToken',
  'integrationSettings',
]);

function getEligiblePages(): PageType[] {
  const allPages = getAllPageTypes();
  return allPages.filter((a) => !NO_BREADCRUMB_PAGES.has(a));
}

function getMockUniversalPageParams(pt: PageType): UniversalPageParams {
  return {
    actionType: 'email',
    dashboardId: '',
    pageType: pt,
    modelId: '',
    featureId: '',
    segment: {
      tags: [],
    },
    profileId: '',
    outputName: '',
    demoName: '',
    monitorId: '',
    passedId: '',
    profiles: [],
    alternativeSegment: {
      tags: [],
    },
    profileReport: '',
  };
}

function renderBreadcrumb() {
  return render(
    <MockedProvider>
      <RecoilRoot>
        <MemoryRouter>
          <Breadcrumb />
        </MemoryRouter>
      </RecoilRoot>
    </MockedProvider>,
  );
}

describe('Ensure that all pages have a breadcrumb', () => {
  const allEligiblePages = getEligiblePages();
  const settingsRootText = 'Settings';
  const projectDashboardRootText = 'Project Dashboard';

  beforeEach(() => {
    mockUseNavLinkHandler();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each([allEligiblePages])('Creates a nonempty breadcrumb for %s', (pt) => {
    jest.spyOn(usePageTypeWithParamsHook, 'usePageTypeWithParams').mockReturnValue(getMockUniversalPageParams(pt));
    jest.spyOn(usePageTypeWithParamsHook, 'usePageType').mockReturnValue(pt);

    renderBreadcrumb();
    const expectedRootText = SETTINGS_PAGES.has(pt) ? settingsRootText : projectDashboardRootText;
    expect(getByText(expectedRootText)).toBeInTheDocument();
  });

  it.each(Array.from(NO_BREADCRUMB_PAGES))('Does not create a breadcrumb for %s page', (pt) => {
    jest.spyOn(usePageTypeWithParamsHook, 'usePageTypeWithParams').mockReturnValue(getMockUniversalPageParams(pt));
    jest.spyOn(usePageTypeWithParamsHook, 'usePageType').mockReturnValue(pt);
    renderBreadcrumb();

    expect(queryByText(settingsRootText)).toBeNull();
    expect(queryByText(projectDashboardRootText)).toBeNull();
  });
});
