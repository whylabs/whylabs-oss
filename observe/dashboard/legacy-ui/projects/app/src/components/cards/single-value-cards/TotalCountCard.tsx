import { useContext, useState } from 'react';
import { Paper } from '@mantine/core';
import {
  TimePeriod,
  useGetAnalysisResultsQuery,
  AnalysisMetric,
  ThresholdAnalysisDataFragment,
  useGetSketchesForTotalCountCardQuery,
} from 'generated/graphql';
import { Colors, HtmlTooltip, SafeLink } from '@whylabs/observatory-lib';
import useWhyCardStyles from 'components/cards/why-card/useWhyCardStyles';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import SingleValuesVisxChart from 'components/visualizations/single-values-chart/SingleValuesVisxChart';
import { STANDARD_GRAPH_HORIZONTAL_BORDERS } from 'ui/constants';
import NoDataChart from 'components/visualizations/no-data-chart/NoDataChart';
import { ApolloError } from '@apollo/client';
import { useAdHoc } from 'atoms/adHocAtom';
import MonitoringMonitorDropdown from 'components/feature-monitor-dropdown/MonitoringMonitorDropdown';
import { simpleStringifySegment } from 'pages/page-types/pageUrlQuery';
import { PairedTimestamp } from 'components/visualizations/utils';
import { WhyLabsText } from 'components/design-system';
import { useElementSize } from 'hooks/useElementSize';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { useSVCardStyles } from './useSVCardsStyle';

interface TotalCountCardProps {
  manualColumnId?: string;
  isCorrelatedAnomalies?: boolean;
  isOutput?: boolean;
}
interface TotalCountProps {
  manualColumnId?: string;
  isCorrelatedAnomalies?: boolean;
  data: { label: string; values: (number | null)[]; color: string }[];
  timestamps: PairedTimestamp[];
  batchFrequency: TimePeriod | undefined;
  hasGraphData: boolean;
  loading: boolean;
  analysisResults: ThresholdAnalysisDataFragment[];
  error: ApolloError | undefined;
  isOutput?: boolean;
}

export const SegmentedTotalCountCard: React.FC<TotalCountCardProps> = ({
  manualColumnId,
  isCorrelatedAnomalies,
  isOutput,
}) => {
  const [adHocRunId] = useAdHoc();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { modelId, featureId, outputName, segment } = usePageTypeWithParams();
  const [{ cardsAnalysisResult }, analysisDispatch] = useContext(AnalysisContext);

  const usedColumnName = manualColumnId || featureId || outputName;
  const { loading, data, error } = useGetSketchesForTotalCountCardQuery({
    variables: { modelId, isOutput, columnName: usedColumnName, ...dateRange, tags: segment.tags },
    skip: loadingDateRange,
  });

  const {
    data: analysisData,
    error: analysisError,
    loading: analysisLoading,
  } = useGetAnalysisResultsQuery({
    variables: {
      anomaliesOnly: false,
      datasetId: modelId,
      ...dateRange,
      metrics: [AnalysisMetric.Count],
      columns: [usedColumnName],
      tags: segment.tags,
      adhocRunId: adHocRunId,
    },
    skip: loadingDateRange,
  });

  const analysisResults = analysisData?.analysisResults ?? [];

  if (analysisResults.length && cardsAnalysisResult.totalCount?.data !== analysisResults && !isCorrelatedAnomalies) {
    analysisDispatch({
      cardsAnalysisResult: { totalCount: { data: analysisResults } },
    });
  }

  const sketches = (() => {
    if (isOutput) return data?.model?.segment?.output?.sketches;
    return data?.model?.segment?.feature?.sketches;
  })();
  const batchFrequency = data?.model?.batchFrequency;
  const hasGraphData = !!sketches && sketches.length > 0;
  const timestamps =
    sketches?.map((sketch) => {
      return { timestamp: sketch.datasetTimestamp ?? 0, lastUploadTimestamp: sketch.lastUploadTimestamp ?? undefined };
    }) ?? [];

  const totalCountData = [
    {
      label: 'Total values',
      values:
        sketches?.map((sketch) => {
          return sketch.totalCount;
        }) ?? [],
      color: Colors.chartPrimary,
    },
  ];
  return (
    <TotalCountCard
      manualColumnId={usedColumnName}
      data={totalCountData}
      timestamps={timestamps}
      batchFrequency={batchFrequency}
      loading={loading || analysisLoading}
      error={error || analysisError}
      analysisResults={analysisResults}
      hasGraphData={hasGraphData}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      isOutput={isOutput}
    />
  );
};

const TotalCountCard: React.FC<TotalCountProps> = ({
  data,
  timestamps,
  batchFrequency,
  hasGraphData,
  loading,
  error,
  analysisResults,
  isCorrelatedAnomalies = false,
  manualColumnId,
  isOutput,
}) => {
  const { classes: styles, cx } = useSVCardStyles();
  const { classes: stylesFromWhyCard } = useWhyCardStyles();
  const [analyzer, setAnalyzer] = useState('');
  const [ref, size] = useElementSize();
  const [adHocRunId] = useAdHoc();
  const { getNavUrl } = useNavLinkHandler();
  const { segment, modelId } = usePageTypeWithParams();
  const [{ cardsAnalysisResult }] = useContext(AnalysisContext);
  const hasAnomalies = !!cardsAnalysisResult.totalCount?.hasAnomalies;

  const getFeatureInputLink = () => {
    return getNavUrl({
      page: isOutput ? 'output' : 'columns',
      modelId,
      segmentTags: { tags: segment.tags },
      featureName: manualColumnId,
    });
  };

  const renderTitle = () => {
    const title = 'Total values';
    if (isCorrelatedAnomalies) {
      return (
        <>
          <SafeLink sameTab primaryColor href={getFeatureInputLink()} text={manualColumnId ?? ''} /> - {title}
        </>
      );
    }
    return manualColumnId ? `${manualColumnId} - ${title}` : title;
  };

  const cardHeaderClassName = (() => {
    if (hasAnomalies && !isCorrelatedAnomalies) {
      return adHocRunId ? stylesFromWhyCard.adHoc : stylesFromWhyCard.alert;
    }
    return '';
  })();

  const cardClassName = (() => {
    if (hasAnomalies && !isCorrelatedAnomalies) {
      return adHocRunId ? stylesFromWhyCard.adHocBorder : stylesFromWhyCard.alertBorder;
    }
    return '';
  })();

  return (
    <div style={{ flex: '1 0 auto', position: 'relative' }} className={styles.longContainerOnFeaturePage}>
      <Paper
        className={cx(stylesFromWhyCard.cardCommon, styles.updateCardCommon, cardClassName, {
          [stylesFromWhyCard.noBorder]: isCorrelatedAnomalies,
        })}
      >
        <div style={{ display: 'flex', alignItems: 'center' }} className={styles.cardHeader}>
          <div className={cx(styles.header)}>
            <span className={cardHeaderClassName}>{renderTitle()}</span>
            <HtmlTooltip tooltipContent="A chart showing the total count of the values in the feature." />
          </div>
          <div>
            <MonitoringMonitorDropdown
              analysisResults={analysisResults}
              setAnalyzer={setAnalyzer}
              showCreateMonitorButton={false}
              analyzer={analyzer}
              analyzerRecoilKey={`segment--${simpleStringifySegment(segment)}--totalCount`}
              cardType="totalCount"
              width={280}
            />
          </div>
        </div>
        {hasGraphData && (
          <div ref={ref}>
            <SingleValuesVisxChart
              cardType="totalCount"
              isCorrelatedAnomalies={isCorrelatedAnomalies}
              manualColumnId={manualColumnId}
              legacyData={[]}
              height={186}
              width={size.width - STANDARD_GRAPH_HORIZONTAL_BORDERS - 25}
              name="Total values"
              timestamps={timestamps}
              data={data}
              yRange={undefined}
              percentage={false}
              showForecast
              decimals={0}
              labelForSingleValues="Total values"
              batchFrequency={batchFrequency}
              anomalies={analysisResults.filter((a) => a.analyzerId === analyzer)}
              useAnomalies
              decorationCardType="total_count"
            />
          </div>
        )}

        {!hasGraphData && loading && (
          <WhyLabsText size={14} className={styles.longGraphMessage}>
            Loading...
          </WhyLabsText>
        )}
        {!hasGraphData && !loading && !error && (
          <NoDataChart noDataMessage="Insufficient data available for time period." />
        )}
        {!hasGraphData && !loading && error && (
          <WhyLabsText size={14} className={styles.longGraphMessage}>
            An error occurred while fetching data
          </WhyLabsText>
        )}
      </Paper>
    </div>
  );
};
