import { useGetFeatureBasicDataQuery } from 'generated/graphql';
import { useQueryParams } from 'utils/queryUtils';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { useEffect, useRef } from 'react';
import { useResetRecoilState } from 'recoil';
import { whyCardsAnalyzersAtom } from 'atoms/whyCardsAnalyzersAtom';
import { ACTION_STATE_TAG, SELECTED_TIMESTAMP } from 'types/navTags';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import FeatureDetailPanelView from './FeatureDetailPanelView';

interface FeatureMonitorCardsProps {
  segment?: ParsedSegment;
}

export const FeatureMonitorCards: React.FC<FeatureMonitorCardsProps> = ({ segment = { tags: [] } }) => {
  const urlParams = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { deleteQueryParam } = useQueryParams();
  const {
    data: featureBasicData,
    error,
    loading,
  } = useGetFeatureBasicDataQuery({
    variables: {
      model: urlParams.modelId || '',
      feature: urlParams.featureId || '',
      ...dateRange,
    },
    skip: loadingDateRange,
  });

  const firstLoad = useRef(true);
  const resetAnalyzersRecoilState = useResetRecoilState(whyCardsAnalyzersAtom);
  const { getAnalysisState } = useStateUrlEncoder();

  useEffect(() => {
    if (!firstLoad.current) return;
    resetAnalyzersRecoilState();
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    if (!actionState) deleteQueryParam(SELECTED_TIMESTAMP);
    firstLoad.current = false;
  }, [deleteQueryParam, getAnalysisState, resetAnalyzersRecoilState]);

  if (error) {
    console.error(error);
  }
  return (
    <FeatureDetailPanelView segment={segment} baseline={featureBasicData?.model?.feature} loadingBasicData={loading} />
  );
};
