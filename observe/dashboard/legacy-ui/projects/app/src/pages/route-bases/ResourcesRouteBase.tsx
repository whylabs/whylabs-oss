import { Route, Routes } from 'react-router-dom';
import { PathReplaces, RelativeOldPages, RelativePages } from 'pages/page-types/pageType';
import { ResourceOverviewPage } from 'pages/resource-overview-page/ResourceOverviewPage';
import { ModelPage } from 'pages/model-page/ModelPage';
import { SegmentFeaturePage } from 'pages/segment-feature-page/SegmentFeaturePage';
import { SegmentPage } from 'pages/segment-page/SegmentPage';
import { FeaturePage } from 'pages/feature-page/FeaturePage';
import { ResourceContextProvider } from 'pages/model-page/context/ResourceContext';
import RedirectWrapper from 'components/redirect/RedirectWrapper';
import {
  LLMRouteBase,
  ResolveConstraintsRoute,
  ResolveOutputsRoute,
  ResolveResourcesDashboardRoute,
} from './resolvers/RouteResolvers';

export default function ResourcesRouteBase(): JSX.Element {
  return (
    <ResourceContextProvider>
      <Routes>
        <Route index element={<ResourceOverviewPage />} />
        {/* Model pages */}
        <Route path={RelativePages.resource}>
          <Route path={`${RelativeOldPages.featuresList}/*`} element={redirectRouteToColumns()} />
          <Route index element={<ModelPage />} />
          <Route path={RelativePages.summary} element={<ModelPage />} />
          <Route path={`${RelativePages.monitorManager}/*`} element={<ModelPage />} />
          {/* Profiles pages */}
          <Route path={RelativePages.dataProfile} element={<ModelPage />} />

          {/* Segment pages */}
          <Route path={`${RelativePages.segmentListing}/*`}>
            <Route index element={<ModelPage />} />
            <Route path=":segment/*">
              <Route path={RelativePages.segmentDataProfile} element={<SegmentPage />} />
              <Route path={RelativePages.segmentFeature}>
                <Route index element={<SegmentFeaturePage />} />
              </Route>
              <Route
                path={RelativePages.segmentOutput}
                element={<ResolveOutputsRoute isSegmented columnPage={false} />}
              />
              <Route
                path={RelativePages.segmentOutputFeature}
                element={<ResolveOutputsRoute isSegmented columnPage />}
              />
              <Route
                path={RelativePages.segmentPerformance}
                element={<ResolveResourcesDashboardRoute isSegmented path="performance" />}
              />
              <Route path={RelativePages.segmentConstraints} element={<ResolveConstraintsRoute />} />
              <Route path={RelativePages.segment} element={<SegmentPage />} />
              <Route path={`${RelativePages.segmentLlmDashboards}/*`} element={<LLMRouteBase isSegmented />} />

              <Route path={`${RelativeOldPages.featuresList}/*`} element={redirectRouteToColumns()} />
            </Route>
          </Route>

          {/* Input Features pages */}
          <Route path={RelativePages.features}>
            <Route index element={<ModelPage />} />
            <Route path={RelativePages.feature}>
              <Route index element={<FeaturePage />} />
            </Route>
          </Route>

          {/* Output Features pages */}
          <Route path={RelativePages.output}>
            <Route index element={<ResolveOutputsRoute isSegmented={false} columnPage={false} />} />
            <Route
              path={RelativePages.outputFeature}
              element={<ResolveOutputsRoute isSegmented={false} columnPage />}
            />
          </Route>

          {/* Tabs pages */}
          <Route
            path={RelativePages.performance}
            element={<ResolveResourcesDashboardRoute isSegmented={false} path="performance" />}
          />
          <Route path={RelativePages.constraints} element={<ResolveConstraintsRoute />} />
          <Route
            path={RelativePages.segmentAnalysis}
            element={<ResolveResourcesDashboardRoute isSegmented={false} path="segment-analysis" />}
          />
          <Route
            path={RelativePages.explainability}
            element={<ResolveResourcesDashboardRoute isSegmented={false} path="explainability" />}
          />
          <Route
            path=":dashboardId"
            element={<ResolveResourcesDashboardRoute isSegmented={false} path=":dashboardId" />}
          />
          <Route path={`${RelativePages.llmDashboards}/*`} element={<LLMRouteBase />} />

          <Route path="*" element={<ModelPage />} />
        </Route>
      </Routes>
    </ResourceContextProvider>
  );

  function redirectRouteToColumns() {
    return <RedirectWrapper keepSearchParams newPath={PathReplaces.columns.new} oldPath={PathReplaces.columns.old} />;
  }
}
