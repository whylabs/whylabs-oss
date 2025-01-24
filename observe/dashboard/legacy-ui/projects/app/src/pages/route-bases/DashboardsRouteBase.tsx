import { Navigate, Route, Routes } from 'react-router-dom';
import { Pages, RelativePages } from 'pages/page-types/pageType';
import { ResourceOverviewPage } from 'pages/resource-overview-page/ResourceOverviewPage';
import { ResourceContextProvider } from 'pages/model-page/context/ResourceContext';
import { DashboardsRouteResolver } from './resolvers/RouteResolvers';

export default function DashboardsRouteBase(): JSX.Element {
  return (
    <ResourceContextProvider>
      <Routes>
        <Route index element={<DashboardsRouteResolver />} />
        <Route path={RelativePages.datasetsSummary} element={<ResourceOverviewPage />} />
        <Route path={RelativePages.modelsSummary} element={<ResourceOverviewPage />} />
        <Route path={RelativePages.customDashboards} element={<ResourceOverviewPage />} />

        <Route path="*" element={<Navigate to={Pages.dashboard} />} />
      </Routes>
    </ResourceContextProvider>
  );
}
