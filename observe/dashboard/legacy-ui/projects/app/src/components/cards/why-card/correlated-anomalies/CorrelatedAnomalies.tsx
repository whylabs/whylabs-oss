import { useState, useContext, useEffect } from 'react';
import { AnalysisDataFragment, SegmentTagFilter, useGetAnalysisResultsQuery } from 'generated/graphql';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsTypography } from 'components/design-system';
import { useAdHoc } from 'atoms/adHocAtom';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import CorrelatedAnomaliesHeader from './CorrelatedAnomaliesHeader';
import CorrelatedAnomaliesFeatureSection from './CorrelatedAnomaliesFeatureSection';
import useCorrelatedAnomaliesCSS from './useCorrelatedAnomaliesCSS';
import { pipeAnomaliesByMetric } from './correlatedAnomaliesUtils';

interface CorrelatedAnomaliesProps {
  tags: SegmentTagFilter[];
}

export default function CorrelatedAnomalies({ tags }: CorrelatedAnomaliesProps): JSX.Element {
  const { classes } = useCorrelatedAnomaliesCSS();
  const [{ correlatedAnomaliesTypeFilterOption, activeCorrelatedAnomalies }, analysisDispatch] =
    useContext(AnalysisContext);
  const urlParams = usePageTypeWithParams();
  const [adhocRunId] = useAdHoc();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { data: analysisData } = useGetAnalysisResultsQuery({
    variables: {
      anomaliesOnly: true,
      datasetId: urlParams.modelId,
      ...dateRange,
      tags: urlParams.segment.tags,
      adhocRunId,
    },
    skip: loadingDateRange,
  });
  const analysisResults = analysisData?.analysisResults ?? [];
  const [prevAnalysis, setPrevAnalysis] = useState<AnalysisDataFragment[]>();
  const filterSelected = !!Object.values(correlatedAnomaliesTypeFilterOption).find(({ checked }) => checked);
  if (analysisData?.analysisResults && prevAnalysis !== analysisResults) {
    const pipedAnomaliesByMetric = pipeAnomaliesByMetric(
      analysisResults,
      activeCorrelatedAnomalies.referenceFeature ?? '',
    );
    analysisDispatch({
      pipedAnomaliesByMetric,
    });
    setPrevAnalysis(analysisResults);
  }

  useEffect(() => {
    return () => {
      analysisDispatch({ activeCorrelatedAnomalies: undefined });
    };
  }, [analysisDispatch]);

  return (
    <div className={classes.cardCorrelatedWrap}>
      <CorrelatedAnomaliesHeader />

      <CorrelatedAnomaliesFeatureSection tags={tags} filterSelected={filterSelected} />

      {!filterSelected && (
        <div className={classes.bottomMsgWrap}>
          <WhyLabsTypography className={classes.bottomMsg}>
            Select an anomaly type to filter correlated anomalies.
          </WhyLabsTypography>
        </div>
      )}
    </div>
  );
}
