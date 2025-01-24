import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ApolloError } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { PageBases, Pages } from 'pages/page-types/pageType';
import { BASE_LOGIN_URI, BASE_LOGOUT_URI, BASE_SIGNUP_URI, DASHBIRD_URI } from 'ui/constants';
import { Permission } from 'generated/graphql';
import { setUseUserContextSpy, getMockedUser } from 'hooks/mocks/mockUseUserContext';
import { RecoilRoot } from 'recoil';
import { WhyRoutes } from './routes';

const LOGIN_URI = `/${BASE_LOGIN_URI}`;
const SIGNUP_URI = `/${BASE_SIGNUP_URI}`;
const LOGOUT_URI = `/${BASE_LOGOUT_URI}`;

const { getByTestId, getByText, queryByText } = screen;

jest.mock('d3-array', () => ({}));
jest.mock('@apollo/client/react/hooks/utils/useDeepMemo', () => ({}));
jest.mock('components/global-loader/GlobalLoader', () => () => <h1>GlobalLoader</h1>);
jest.mock('pages/route-bases/ResourcesRouteBase', () => () => <h1>ResourcesRouteBase</h1>);
jest.mock('pages/route-bases/SettingsRouteBase', () => () => <h1>SettingsRouteBase</h1>);
jest.mock('pages/route-bases/DashboardsRouteBase', () => () => <h1>DashboardsRouteBase</h1>);
jest.mock('pages/route-bases/GetStartedRouteBase', () => () => <h1>GetStartedRouteBase</h1>);
jest.mock('pages/design-playground/DesignPlaygroundPage', () => () => <h1>DesignPlaygroundPage</h1>);
jest.mock('pages/errors', () => ({
  NotFoundPage: () => <h1>NotFoundPage</h1>,
  UnknownErrorPage: () => <h1>UnknownErrorPage</h1>,
  UnverifiedEmailPage: () => <h1>UnverifiedEmailPage</h1>,
  UnsupportedDevicePage: () => <h1>UnsupportedDevicePage</h1>,
}));
jest.mock('pages/admin/AdminPage', () => ({
  AdminPage: () => <h1>AdminPage</h1>,
}));
jest.mock('pages/new-user-page/NewUserPage', () => ({
  NewUserPage: () => <h1>NewUserPage</h1>,
}));

describe('Routes', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: jest.fn<void, [string | URL]>(), reload: jest.fn() },
    });

    setUseUserContextSpy();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    jest.restoreAllMocks();
  });

  it('should not render GlobalLoader component when loading=false', () => {
    setUseUserContextSpy({ loading: false });

    getRenderer();
    expect(queryByText('GlobalLoader')).not.toBeInTheDocument();
  });

  it('should render the GlobalLoader component when loading=true', () => {
    setUseUserContextSpy({ loading: true });

    getRenderer();
    expect(getByText('GlobalLoader')).toBeInTheDocument();
  });

  it('should render UnknownErrorPage when error is set', () => {
    setUseUserContextSpy({ error: new ApolloError({ errorMessage: 'Something went wrong' }) });

    getRenderer();
    expect(getByText('UnknownErrorPage')).toBeInTheDocument();
  });

  it.each([
    ['NotFoundPage', PageBases.notFound],
    ['NewUserPage', PageBases.newUser],
    ['UnverifiedEmailPage', PageBases.unverifiedEmail],
  ])('should render %p for route %p', (expected, route) => {
    getRenderer([route]);
    expect(getByText(expected)).toBeInTheDocument();
  });

  describe("when user isn't logged in", () => {
    it('should redirect to login page', () => {
      getRenderer([LOGIN_URI]);
      expect(window.location.href.includes(`${DASHBIRD_URI}${LOGIN_URI}`)).toBeTruthy();
    });

    it('should redirect to login page with query string', () => {
      getRenderer([`${LOGIN_URI}?test=1`]);
      expect(window.location.href.includes(`${DASHBIRD_URI}${LOGIN_URI}?test=1`)).toBeTruthy();
    });

    it('should redirect to signup page', () => {
      getRenderer([SIGNUP_URI]);
      expect(window.location.href.includes(`${DASHBIRD_URI}${SIGNUP_URI}`)).toBeTruthy();
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      setUseUserContextSpy({ user: getMockedUser() });
    });

    it.each([LOGIN_URI, SIGNUP_URI, LOGOUT_URI])('should redirect to Dashbird when url is %p', (route) => {
      getRenderer([route]);
      expect(getByTestId('location')).toHaveTextContent(route);
    });

    it('should redirect to the models page from the dashboard route', () => {
      getRenderer([Pages.dashboard]);
      expect(getByText('ResourcesRouteBase')).toBeInTheDocument();
    });

    it.each([
      PageBases.resources,
      Pages.resource,
      Pages.features,
      Pages.performance,
      Pages.dataProfile,
      Pages.explainability,
      Pages.segmentListing,
      Pages.output,
      Pages.summary,
      Pages.monitorManager,
      Pages.monitorManagerPresets,
      Pages.monitorManagerAnomaliesFeed,
      Pages.monitorManagerMonitorRuns,
      Pages.monitorManagerConfigInvestigator,
      Pages.monitorManagerCustomConfigInvestigator,
      Pages.monitorManagerCustomize,
      Pages.monitorManagerCustomizeExisting,
      Pages.monitorManagerCustomizeJson,
      Pages.monitorManagerCustomizeJsonPreset,
    ])('should render the models page for %p', (route) => {
      getRenderer([route]);
      expect(getByText('ResourcesRouteBase')).toBeInTheDocument();
    });

    it.each([
      ['AdminPage', PageBases.admin],
      ['DashboardsRouteBase', Pages.customDashboards],
    ])('should render %p for route %p', (expected, route) => {
      getRenderer([route]);
      expect(getByText(expected)).toBeInTheDocument();
    });

    it('should render get started page when the user can manage datasets', () => {
      setUseUserContextSpy({
        user: getMockedUser({
          permissions: [Permission.ViewData, Permission.ManageDatasets],
        }),
      });
      getRenderer([PageBases.getStarted]);
      expect(getByText('GetStartedRouteBase')).toBeInTheDocument();
    });

    describe('old pages redirect rules', () => {
      it.each([
        '/models',
        '/models/1234/features',
        '/models/1234/summary?sortModelBy=LatestAlert&sortModelDirection=DESC',
      ])('should redirect old %p to /resources', (route) => {
        getRenderer([route]);
        expect(getByText('ResourcesRouteBase')).toBeInTheDocument();
        expect(getByTestId('location')).toHaveTextContent(route.replace('/models', PageBases.resources));
      });

      it.each([
        '/assets',
        '/assets/1234/features',
        '/assets/1234/summary?sortModelBy=LatestAlert&sortModelDirection=DESC',
      ])('should redirect old %p to /resources', (route) => {
        getRenderer([route]);
        expect(getByText('ResourcesRouteBase')).toBeInTheDocument();
        expect(getByTestId('location')).toHaveTextContent(route.replace('/assets', PageBases.resources));
      });
    });
  });
});

// Helpers
function getRenderer(initialEntries: string[] = [PageBases.notFound]) {
  return render(
    <MockedProvider>
      <RecoilRoot>
        <MemoryRouter initialEntries={initialEntries}>
          <WhyRoutes />
          <TestComponent />
        </MemoryRouter>
      </RecoilRoot>
    </MockedProvider>,
  );
}

function TestComponent() {
  const location = useLocation();

  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}
