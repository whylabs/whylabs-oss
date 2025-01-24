import { useFeatureBasicDataFast } from 'hooks/useFeatureBasicData';
import { FeatureDataSideTableFragment } from 'generated/graphql';
import FeatureHeaderPanelView from './FeatureHeaderPanelView';
import { FeatureComparisonHeaderPanel } from './FeatureComparisonHeaderPanel';

export interface FeatureHeaderPanelProps {
  featureSideTableData?: FeatureDataSideTableFragment[];
  showCompareSegments?: boolean;
}

function FeatureHeaderPanel({ featureSideTableData, showCompareSegments }: FeatureHeaderPanelProps): JSX.Element {
  const { loading, error, data } = useFeatureBasicDataFast();

  if (showCompareSegments) {
    return <FeatureComparisonHeaderPanel loading={loading} error={error} featureBasicData={data} />;
  }

  return (
    <FeatureHeaderPanelView
      loading={loading}
      error={error}
      featureBasicData={data}
      featureSideTableData={featureSideTableData}
    />
  );
}

export default FeatureHeaderPanel;
