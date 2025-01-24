import { LLMDashboardsPath, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { WhyLabsLoadingOverlay } from 'components/design-system';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AssetCategory, ModelType } from 'generated/graphql';
import { ModelPage } from 'pages/model-page/ModelPage';
import { SegmentPage } from 'pages/segment-page/SegmentPage';
import { RelativePages } from 'pages/page-types/pageType';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import RedirectWrapper from 'components/redirect/RedirectWrapper';
import { SegmentOutputsPage } from 'pages/segment-output-page/SegmentOutputsPage';
import { ModelOutputsPage } from 'pages/model-outputs-page/ModelOutputsPage';
import { useFetchModelType } from './useFetchModelType';

const useLLMNewPages = () => {
  const { modelType, loading } = useFetchModelType();

  const allowLLM = modelType === ModelType.Llm;
  const totalLoading = loading || !modelType;
  return {
    allowLLM,
    loading: totalLoading,
  };
};

export const DashboardsRouteResolver: React.FC = () => {
  const { getNavUrl } = useNavLinkHandler();

  return <Navigate to={getNavUrl({ page: 'customDashboards' })} />;
};

const LLMDashboardRouteResolver: React.FC<{ isSegmented?: boolean }> = ({ isSegmented }) => {
  const { allowLLM, loading } = useLLMNewPages();
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();
  if (loading) return <WhyLabsLoadingOverlay visible />;
  if (allowLLM) return isSegmented ? <SegmentPage /> : <ModelPage />;
  return <Navigate to={getNavUrl({ modelId, page: 'summary' })} />;
};

export const LLMRouteBase: React.FC<{ isSegmented?: boolean }> = ({ isSegmented }) => {
  const { allowLLM, loading } = useLLMNewPages();
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();

  if (loading) return <WhyLabsLoadingOverlay visible />;
  if (!allowLLM) return <Navigate to={getNavUrl({ modelId, page: 'summary' })} />;
  return (
    <Routes>
      <Route
        index
        element={
          <RedirectWrapper
            keepSearchParams
            newPath={RelativePages.llmSecurityDashboard}
            oldPath={RelativePages.llmDashboards}
          />
        }
      />
      <Route path="*" element={<LLMDashboardRouteResolver isSegmented={isSegmented} />} />
    </Routes>
  );
};

export const ResolveConstraintsRoute = (): JSX.Element => {
  const { modelType, loading } = useFetchModelType();
  const totalLoading = loading || !modelType;

  const { getNavUrl } = useNavLinkHandler();
  const { modelId, segment } = usePageTypeWithParams();
  if (totalLoading) return <WhyLabsLoadingOverlay visible />;
  return <Navigate to={getNavUrl({ modelId, page: 'summary', segmentTags: segment })} />;
};

export const ResolveOutputsRoute = ({
  isSegmented,
  columnPage,
}: {
  isSegmented: boolean;
  columnPage: boolean;
}): JSX.Element => {
  const { modelType, loading } = useFetchModelType();

  const typeWithoutOutputs = !!(
    modelType && [ModelType.DataOther, ModelType.DataSource, ModelType.DataStream, ModelType.Llm].includes(modelType)
  );

  const totalLoading = loading || !modelType;

  const { getNavUrl } = useNavLinkHandler();
  const { modelId, segment } = usePageTypeWithParams();
  if (totalLoading) return <WhyLabsLoadingOverlay visible />;
  if (typeWithoutOutputs) return <Navigate to={getNavUrl({ modelId, page: 'columns', segmentTags: segment })} />;
  if (columnPage) return isSegmented ? <SegmentOutputsPage /> : <ModelOutputsPage />;
  return isSegmented ? <SegmentPage /> : <ModelPage />;
};

export const ResolveResourcesDashboardRoute = ({
  isSegmented,
  path,
}: {
  isSegmented: boolean;
  path: 'explainability' | 'performance' | 'segment-analysis' | ':dashboardId';
}): JSX.Element => {
  const { modelType, resourceCategory, loading } = useFetchModelType();
  const { getNavUrl } = useNavLinkHandler();
  const { dashboardId, modelId, segment } = usePageTypeWithParams();

  const typeWithResourceDashboards = !!(
    modelType &&
    [
      ModelType.Embeddings,
      ModelType.Ranking,
      ModelType.ModelOther,
      ModelType.Regression,
      ModelType.Classification,
      ModelType.Unknown,
    ].includes(modelType)
  );

  const isDataset = resourceCategory === AssetCategory.Data;
  const isDatasetSegmentAnalysis = isDataset && path === 'segment-analysis';
  const isDatasetCustomDashboard = isDataset && path === ':dashboardId';

  if (loading) return <WhyLabsLoadingOverlay visible />;
  // continue to resource dashboard
  if (typeWithResourceDashboards || isDatasetSegmentAnalysis || isDatasetCustomDashboard) {
    if (isSegmented) return <SegmentPage />;
    return <ModelPage />;
  }
  // redirect LLM to LLM dashboards
  if (modelType === ModelType.Llm) {
    const dashboardPath: LLMDashboardsPath = (() => {
      if (path === ':dashboardId') {
        // Typecast it because we are using the dashboard id as a dynamic key for this specific case.
        return dashboardId as LLMDashboardsPath;
      }

      if (path === 'performance' || path === 'segment-analysis') return path;
      return 'security';
    })();

    return <Navigate to={getNavUrl({ modelId, page: 'dashboards', dashboards: { path: dashboardPath } })} />;
  }
  // Data resources should redirect to summary
  return <Navigate to={getNavUrl({ modelId, page: 'summary', segmentTags: segment })} />;
};
