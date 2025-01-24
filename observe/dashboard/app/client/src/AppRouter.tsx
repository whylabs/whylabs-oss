import { ErrorPage } from '~/error-page';
import { AppIndex } from '~/routes';
import { EmbeddingsProjector } from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/EmbeddingsProjector';
import { PolicyAdvancedSettings } from '~/routes/:orgId/:resourceId/llm-trace/policy/pages/PolicyAdvancedSettings';
import { PolicyChangeHistory } from '~/routes/:orgId/:resourceId/llm-trace/policy/pages/PolicyChangeHistory';
import { PolicyRuleSets } from '~/routes/:orgId/:resourceId/llm-trace/policy/pages/PolicyRuleSets';
import { loader as resourceIdLayoutLoader } from '~/routes/:orgId/:resourceId/ResourceIdLayoutLoader';
import { ResourceSegmentAnalysisIndex } from '~/routes/:orgId/:resourceId/segment-analysis/ResourceSegmentAnalysisIndex';
import { DashboardsWidgetIdIndex } from '~/routes/:orgId/dashboard/:dashboardId/:widgetId/DashboardsWidgetIdIndex';
import { loader as DashboardsWidgetIdLoader } from '~/routes/:orgId/dashboard/:dashboardId/:widgetId/useDashboardsWidgetIdIndexViewModel';
import { loader as DashboardIdIndexLayoutLoader } from '~/routes/:orgId/dashboard/:dashboardId/layout/useDashboardIdLayoutLoader';
import { loader as DashboardIdIndexLoader } from '~/routes/:orgId/dashboard/:dashboardId/useDashboardIdViewModel';
import { DashboardIndex } from '~/routes/:orgId/dashboard/DashboardIndex';
import { DashboardLayout } from '~/routes/:orgId/dashboard/DashboardLayout';
import { loader as dashboardIndexLoader } from '~/routes/:orgId/dashboard/useDashboardIndexViewModel';
import { OrgIdIndex } from '~/routes/:orgId/OrgIdIndex';
import { OrgIdLayout } from '~/routes/:orgId/OrgIdLayout';
import { loader as orgIdLayoutLoader } from '~/routes/:orgId/OrgIdLayoutLoader';
import { SummaryIndex } from '~/routes/:orgId/summary/SummaryIndex';
import { loader as SummaryIndexLoader } from '~/routes/:orgId/summary/useSummaryIndexViewModel';
import Root from '~/routes/root';
import { rootLoader } from '~/routes/rootLoader';
import { loader as appIndexLoader } from '~/routes/useRootIndexViewModel';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import _isEqual from 'lodash/isEqual';
import { JSX } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { ResourceConstraintsIndex } from './routes/:orgId/:resourceId/constraints/ResourceConstraintsIndex';
import { loader as ResourceConstraintsIndexLoader } from './routes/:orgId/:resourceId/constraints/useResourceConstraintsViewModel';
import { DeprecatedLlmTraceRoute } from './routes/:orgId/:resourceId/llm-trace/DeprecatedLlmTraceRoute';
import { LlmTraceIndex } from './routes/:orgId/:resourceId/llm-trace/LlmTraceIndex';
import { LlmTraceLayout } from './routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { LlmTracePolicyIndex } from './routes/:orgId/:resourceId/llm-trace/policy/LlmTracePolicyIndex';
import { loader as LlmTracePolicyLoader } from './routes/:orgId/:resourceId/llm-trace/policy/useLlmTracePolicyViewModel';
import { LlmTraceSummary } from './routes/:orgId/:resourceId/llm-trace/summary/LlmTraceSummary';
import {
  loader as LlmEmbeddingsProjectorLoader,
  loader as LlmTraceSummaryLoader,
} from './routes/:orgId/:resourceId/llm-trace/summary/useLlmTraceSummaryViewModel';
import { LlmTraceItemId } from './routes/:orgId/:resourceId/llm-trace/traces/:traceId/:itemId/LlmTraceItemId';
import { loader as LlmTraceItemIdLoader } from './routes/:orgId/:resourceId/llm-trace/traces/:traceId/:itemId/useLlmTraceItemIdViewModel';
import { LlmTraceId } from './routes/:orgId/:resourceId/llm-trace/traces/:traceId/LlmTraceId';
import { loader as LlmTraceIdLoader } from './routes/:orgId/:resourceId/llm-trace/traces/:traceId/useLlmTraceIdViewModel';
import { LlmTraceTraces } from './routes/:orgId/:resourceId/llm-trace/traces/LlmTraceTraces';
import { loader as LlmTraceIndexLoader } from './routes/:orgId/:resourceId/llm-trace/traces/useLlmTraceViewModel';
import { loader as LlmTraceLayoutLoader } from './routes/:orgId/:resourceId/llm-trace/useLlmTraceLayoutViewModel';
import { ResourceIdIndex } from './routes/:orgId/:resourceId/ResourceIdIndex';
import { ResourceIdLayout } from './routes/:orgId/:resourceId/ResourceIdLayout';
import { loader as ResourceSegmentAnalysisLoader } from './routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import { ResourceSingleProfile } from './routes/:orgId/:resourceId/single-profile/ResourceSingleProfile';
import { loader as ResourceSingleProfileLoader } from './routes/:orgId/:resourceId/single-profile/ResourceSingleProfileViewModel';
import { DashboardIdErrorPage } from './routes/:orgId/dashboard/:dashboardId/DashboardIdErrorPage';
import { DashboardIdIndex } from './routes/:orgId/dashboard/:dashboardId/DashboardIdIndex';
import { DashboardIdIndexLayout as DashboardIdLayout } from './routes/:orgId/dashboard/:dashboardId/layout/DashboardIdLayout';
import { PlaygroundIndex } from './routes/:orgId/playground/PlaygroundIndex';
import { AccessTokensIndex } from './routes/:orgId/settings/access-tokens/AccessTokensIndex';
import { BillingPageIndex } from './routes/:orgId/settings/billing/BillingIndex';
import { IntegrationPageIndex } from './routes/:orgId/settings/integrations/IntegrationPageIndex';
import { NotificationActionDetails } from './routes/:orgId/settings/notifications/NotificationActionDetails';
import { NotificationActionsIndex } from './routes/:orgId/settings/notifications/NotificationIndex';
import { ResourceManagementIndex } from './routes/:orgId/settings/resource-management/ResourceManagementIndex';
import { SettingsIndex } from './routes/:orgId/settings/SettingsIndex';
import { SettingsRoot } from './routes/:orgId/settings/SettingsRoot';
import { EditUserIndex } from './routes/:orgId/settings/user-management/edit/EditUserIndex';
import { loader as EditUserLoader } from './routes/:orgId/settings/user-management/edit/useEditUserViewModel';
import { UserManagementIndex } from './routes/:orgId/settings/user-management/UserManagementIndex';
import { getSettingsPageTitle } from './routes/:orgId/settings/utils/settingsPageUtils';
import LoginPage, { loader as loginLoader } from './routes/login';
import { WhyLabsRouteObject } from './types/routerTypes';

const dashboardRoute: WhyLabsRouteObject = {
  id: 'orgIdDashboards',
  path: AppRoutePaths.orgIdDashboards,
  element: <DashboardLayout />,
  shouldRevalidate: () => false,
  children: [
    {
      id: 'orgIdDashboardsIndex',
      index: true,
      element: <DashboardIndex />,
      loader: dashboardIndexLoader,
      shouldRevalidate: () => false,
    },
    {
      element: <DashboardIdLayout />,
      errorElement: <DashboardIdErrorPage />,
      id: 'orgIdDashboardId',
      path: AppRoutePaths.orgIdDashboardId,
      loader: DashboardIdIndexLayoutLoader,
      shouldRevalidate: ({ currentParams, nextParams, nextUrl }) => {
        const dashboardId = nextParams?.dashboardId;

        // We want to always revalidate when on the dashboard index page
        if (dashboardId && nextUrl.pathname.endsWith(`${AppRoutePaths.orgIdDashboards}/${dashboardId}`)) {
          return true;
        }

        // But for the children routes, we only want to revalidate when the params changes
        return !_isEqual(currentParams, nextParams);
      },
      children: [
        {
          element: <DashboardIdIndex />,
          id: 'orgIdDashboardIdIndex',
          index: true,
          loader: DashboardIdIndexLoader,
          shouldRevalidate: ({ currentParams, nextParams }) => !_isEqual(currentParams, nextParams),
        },
        {
          element: <DashboardsWidgetIdIndex />,
          id: 'orgIdDashboardsWidgetId',
          loader: DashboardsWidgetIdLoader,
          path: AppRoutePaths.orgIdDashboardsWidgetId,
          shouldRevalidate: ({ currentParams, nextParams }) => !_isEqual(currentParams, nextParams),
        },
      ],
    },
  ],
};

const resourceRoute: WhyLabsRouteObject = {
  id: 'orgIdResourceId',
  path: AppRoutePaths.orgIdResourceId,
  element: <ResourceIdLayout />,
  loader: resourceIdLayoutLoader,
  shouldRevalidate: ({ currentParams, nextParams }) => currentParams.resourceId !== nextParams.resourceId,
  children: [
    {
      id: 'orgIdResourceIdIndex',
      index: true,
      element: <ResourceIdIndex />,
    },
    {
      id: 'resourceIdConstraints',
      path: AppRoutePaths.resourceIdConstraints,
      element: <ResourceConstraintsIndex />,
      loader: ResourceConstraintsIndexLoader,
      shouldRevalidate: ({ currentParams, nextParams }) =>
        currentParams.orgId !== nextParams.orgId || currentParams.resourceId !== nextParams.resourceId,
    },
    {
      id: 'resourceIdSegmentAnalysis',
      path: AppRoutePaths.resourceIdSegmentAnalysis,
      element: <ResourceSegmentAnalysisIndex />,
      loader: ResourceSegmentAnalysisLoader,
      shouldRevalidate: ({ currentParams, nextParams }) =>
        currentParams.orgId !== nextParams.orgId || currentParams.resourceId !== nextParams.resourceId,
    },
    {
      element: <DeprecatedLlmTraceRoute />,
      id: 'deprecatedLlmTraceIncludingAllChildren',
      path: AppRoutePaths.deprecatedLlmTraceIncludingAllChildren,
    },
    {
      element: <LlmTraceLayout />,
      id: 'resourceIdLlmTrace',
      path: AppRoutePaths.resourceIdLlmTrace,
      loader: LlmTraceLayoutLoader,
      shouldRevalidate: ({ currentUrl, nextUrl }) => !_isEqual(currentUrl, nextUrl),
      children: [
        {
          element: <LlmTraceIndex />,
          id: 'resourceIdLlmTraceIndex',
          index: true,
        },
        {
          element: <LlmTraceSummary />,
          id: 'resourceIdLlmTraceSummary',
          loader: LlmTraceSummaryLoader,
          path: AppRoutePaths.resourceIdLlmTraceSummary,
          shouldRevalidate: ({ currentParams, nextParams }) =>
            currentParams.orgId !== nextParams.orgId || currentParams.resourceId !== nextParams.resourceId,
        },
        {
          element: <LlmTracePolicyIndex />,
          id: 'resourceIdLlmTracePolicy',
          loader: LlmTracePolicyLoader,
          path: AppRoutePaths.resourceIdLlmTracePolicy,
          shouldRevalidate: ({ currentParams, nextParams }) =>
            currentParams.orgId !== nextParams.orgId || currentParams.resourceId !== nextParams.resourceId,
          children: [
            {
              element: <PolicyRuleSets />,
              id: 'resourceIdLlmTracePolicyIndex',
              index: true,
            },
            {
              element: <PolicyAdvancedSettings />,
              id: 'resourceIdLlmTracePolicyAdvancedSettings',
              path: AppRoutePaths.resourceIdLlmTracePolicyAdvancedSettings,
            },
            {
              element: <PolicyChangeHistory />,
              id: 'resourceIdLlmTracePolicyChangeHistory',
              path: AppRoutePaths.resourceIdLlmTracePolicyChangeHistory,
            },
          ],
        },
        {
          element: <LlmTraceTraces />,
          id: 'resourceIdLlmTraceTab',
          path: AppRoutePaths.resourceIdLlmTraceTab,
          loader: LlmTraceIndexLoader,
          shouldRevalidate: ({ currentUrl, nextUrl }) => !_isEqual(currentUrl, nextUrl),
          children: [
            {
              element: <LlmTraceId />,
              id: 'traceId',
              loader: LlmTraceIdLoader,
              shouldRevalidate: ({ currentParams, nextParams }) =>
                currentParams.orgId !== nextParams.orgId ||
                currentParams.resourceId !== nextParams.resourceId ||
                currentParams.traceId !== nextParams.traceId ||
                currentParams.itemId !== nextParams.itemId,
              path: AppRoutePaths.traceId,
              children: [
                {
                  element: <LlmTraceItemId />,
                  id: 'traceIdItemId',
                  loader: LlmTraceItemIdLoader,
                  shouldRevalidate: ({ currentParams, nextParams }) =>
                    currentParams.orgId !== nextParams.orgId ||
                    currentParams.resourceId !== nextParams.resourceId ||
                    currentParams.traceId !== nextParams.traceId ||
                    currentParams.itemId !== nextParams.itemId,
                  path: AppRoutePaths.traceIdItemId,
                },
              ],
            },
            {
              element: <EmbeddingsProjector />,
              id: 'resourceIdLlmTracesEmbeddingsProjector',
              loader: LlmEmbeddingsProjectorLoader,
              path: AppRoutePaths.resourceIdLlmTracesEmbeddingsProjector,
              shouldRevalidate: ({ currentParams, nextParams }) =>
                currentParams.orgId !== nextParams.orgId || currentParams.resourceId !== nextParams.resourceId,
            },
          ],
        },
      ],
    },
    {
      id: 'resourceIdSingleProfile',
      path: AppRoutePaths.resourceIdSingleProfile,
      element: <ResourceSingleProfile />,
      loader: ResourceSingleProfileLoader,
      shouldRevalidate: ({ currentParams, nextParams }) =>
        currentParams.orgId !== nextParams.orgId || currentParams.resourceId !== nextParams.resourceId,
    },
  ],
};

const orgIdRoute: WhyLabsRouteObject = {
  id: 'orgId',
  path: AppRoutePaths.orgId,
  element: <OrgIdLayout />,
  loader: orgIdLayoutLoader,
  shouldRevalidate: ({ currentParams, nextParams }) => currentParams.orgId !== nextParams.orgId,
  children: [
    {
      id: 'orgIdIndex',
      index: true,
      element: <OrgIdIndex />,
    },
    {
      id: 'orgIdResourcesSummary',
      path: AppRoutePaths.orgIdResourcesSummary,
      element: <SummaryIndex />,
      loader: SummaryIndexLoader,
      shouldRevalidate: ({ currentParams, nextParams }) => currentParams.orgId !== nextParams.orgId,
    },
    {
      id: 'orgIdSettings',
      path: AppRoutePaths.orgIdSettings,
      element: <SettingsRoot />,
      children: [
        {
          handle: { title: () => 'Settings' },
          id: 'orgIdSettingsIndex',
          index: true,
          element: <SettingsIndex />,
        },
        {
          handle: { title: () => getSettingsPageTitle('orgIdSettingsAccessToken') },
          id: 'orgIdSettingsAccessToken',
          path: AppRoutePaths.orgIdSettingsAccessToken,
          element: <AccessTokensIndex />,
        },
        {
          handle: { title: () => getSettingsPageTitle('orgIdSettingsUserManagement') },
          id: 'orgIdSettingsUserManagement',
          path: AppRoutePaths.orgIdSettingsUserManagement,
          element: <UserManagementIndex />,
          children: [
            {
              id: 'orgIdSettingsUserManagementEdit',
              loader: EditUserLoader,
              path: AppRoutePaths.orgIdSettingsUserManagementEdit,
              element: <EditUserIndex />,
            },
          ],
        },
        {
          handle: { title: () => getSettingsPageTitle('orgIdSettingsNotifications') },
          id: 'orgIdSettingsNotifications',
          path: AppRoutePaths.orgIdSettingsNotifications,
          children: [
            {
              id: 'orgIdSettingsNotificationsIndex',
              index: true,
              element: <NotificationActionsIndex />,
            },
            {
              id: 'orgIdSettingsNotificationDetails',
              path: AppRoutePaths.orgIdSettingsNotificationDetails,
              element: <NotificationActionDetails />,
            },
          ],
        },
        {
          handle: { title: () => getSettingsPageTitle('orgIdSettingsIntegrations') },
          id: 'orgIdSettingsIntegrations',
          path: AppRoutePaths.orgIdSettingsIntegrations,
          element: <IntegrationPageIndex />,
        },
        {
          handle: { title: () => getSettingsPageTitle('orgIdSettingsBilling') },
          id: 'orgIdSettingsBilling',
          path: AppRoutePaths.orgIdSettingsBilling,
          element: <BillingPageIndex />,
        },
        {
          handle: { title: () => getSettingsPageTitle('orgIdSettingsResourceManagement') },
          id: 'orgIdSettingsResourceManagement',
          path: AppRoutePaths.orgIdSettingsResourceManagement,
          element: <ResourceManagementIndex />,
        },
      ],
    },

    dashboardRoute,
    {
      id: 'orgIdPlayground',
      path: AppRoutePaths.orgIdPlayground,
      children: [
        {
          handle: { title: () => 'Component playground' },
          id: 'orgIdPlaygroundIndex',
          index: true,
          element: <PlaygroundIndex />,
        },
      ],
    },
    resourceRoute,
  ],
};

const routes: WhyLabsRouteObject[] = [
  {
    id: 'root',
    path: AppRoutePaths.root,
    element: <Root />,
    loader: rootLoader,
    shouldRevalidate: ({ currentParams, nextParams }) => currentParams.orgId !== nextParams.orgId,
    errorElement: <ErrorPage />,
    children: [
      {
        id: 'rootIndex',
        index: true,
        element: <AppIndex />,
        loader: appIndexLoader,
      },
      {
        id: 'login',
        path: AppRoutePaths.login,
        element: <LoginPage />,
        loader: loginLoader,
      },
      orgIdRoute,
    ],
  },
];

const router = createBrowserRouter(routes, {
  future: {
    v7_normalizeFormMethod: true,
  },
});

const AppRouter = (): JSX.Element => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
