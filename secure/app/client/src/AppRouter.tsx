import _isEqual from 'lodash/isEqual';
import { JSX } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ErrorPage } from '~/error-page';
import { AppIndex } from '~/routes';
import { PolicyAdvancedSettings } from '~/routes/:resourceId/llm-trace/policy/pages/PolicyAdvancedSettings';
import { PolicyCallbackSettings } from '~/routes/:resourceId/llm-trace/policy/pages/PolicyCallbackSettings';
import { PolicyChangeHistory } from '~/routes/:resourceId/llm-trace/policy/pages/PolicyChangeHistory';
import { PolicyRuleSets } from '~/routes/:resourceId/llm-trace/policy/pages/PolicyRuleSets';
import { loader as resourceIdLayoutLoader } from '~/routes/:resourceId/ResourceIdLayoutLoader';
import Root from '~/routes/root';
import { SummaryIndex } from '~/routes/summary/SummaryIndex';
import { AppRoutePaths } from '~/types/AppRoutePaths';

import { LlmTraceIndex } from './routes/:resourceId/llm-trace/LlmTraceIndex';
import { LlmTraceLayout } from './routes/:resourceId/llm-trace/LlmTraceLayout';
import { LlmTracePolicyIndex } from './routes/:resourceId/llm-trace/policy/LlmTracePolicyIndex';
import { loader as LlmTracePolicyLoader } from './routes/:resourceId/llm-trace/policy/useLlmTracePolicyViewModel';
import { LlmTraceSummary } from './routes/:resourceId/llm-trace/summary/LlmTraceSummary';
import { loader as LlmTraceSummaryLoader } from './routes/:resourceId/llm-trace/summary/useLlmTraceSummaryViewModel';
import { LlmTraceItemId } from './routes/:resourceId/llm-trace/traces/:traceId/:itemId/LlmTraceItemId';
import { loader as LlmTraceItemIdLoader } from './routes/:resourceId/llm-trace/traces/:traceId/:itemId/useLlmTraceItemIdViewModel';
import { LlmTraceId } from './routes/:resourceId/llm-trace/traces/:traceId/LlmTraceId';
import { loader as LlmTraceIdLoader } from './routes/:resourceId/llm-trace/traces/:traceId/useLlmTraceIdViewModel';
import { LlmTraceTraces } from './routes/:resourceId/llm-trace/traces/LlmTraceTraces';
import { loader as LlmTraceIndexLoader } from './routes/:resourceId/llm-trace/traces/useLlmTraceViewModel';
import { loader as LlmTraceLayoutLoader } from './routes/:resourceId/llm-trace/useLlmTraceLayoutViewModel';
import { ResourceIdIndex } from './routes/:resourceId/ResourceIdIndex';
import { ResourceIdLayout } from './routes/:resourceId/ResourceIdLayout';
import { WhyLabsRouteObject } from './types/routerTypes';

const resourceRoute: WhyLabsRouteObject = {
  id: 'resourceId',
  path: AppRoutePaths.resourceId,
  element: <ResourceIdLayout />,
  loader: resourceIdLayoutLoader,
  shouldRevalidate: ({ currentParams, nextParams }) => currentParams.resourceId !== nextParams.resourceId,
  children: [
    {
      id: 'resourceIdIndex',
      index: true,
      element: <ResourceIdIndex />,
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
          shouldRevalidate: ({ currentParams, nextParams }) => currentParams.resourceId !== nextParams.resourceId,
        },
        {
          element: <LlmTracePolicyIndex />,
          id: 'resourceIdLlmTracePolicy',
          loader: LlmTracePolicyLoader,
          path: AppRoutePaths.resourceIdLlmTracePolicy,
          shouldRevalidate: ({ currentUrl, nextUrl }) => !_isEqual(currentUrl, nextUrl),
          children: [
            {
              element: <PolicyRuleSets />,
              id: 'resourceIdLlmTracePolicyIndex',
              index: true,
            },
            {
              element: <PolicyCallbackSettings />,
              id: 'resourceIdLlmTracePolicyCallbackSettings',
              path: AppRoutePaths.resourceIdLlmTracePolicyCallbackSettings,
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
                currentParams.resourceId !== nextParams.resourceId ||
                currentParams.tabId !== nextParams.tabId ||
                currentParams.traceId !== nextParams.traceId ||
                currentParams.itemId !== nextParams.itemId,
              path: AppRoutePaths.traceId,
              children: [
                {
                  element: <LlmTraceItemId />,
                  id: 'traceIdItemId',
                  loader: LlmTraceItemIdLoader,
                  shouldRevalidate: ({ currentParams, nextParams }) =>
                    currentParams.resourceId !== nextParams.resourceId ||
                    currentParams.traceId !== nextParams.traceId ||
                    currentParams.itemId !== nextParams.itemId,
                  path: AppRoutePaths.traceIdItemId,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const routes: WhyLabsRouteObject[] = [
  {
    id: 'root',
    path: AppRoutePaths.root,
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        id: 'rootIndex',
        index: true,
        element: <AppIndex />,
      },
      {
        id: 'resourcesSummary',
        path: AppRoutePaths.resourcesSummary,
        element: <SummaryIndex />,
      },
      resourceRoute,
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
