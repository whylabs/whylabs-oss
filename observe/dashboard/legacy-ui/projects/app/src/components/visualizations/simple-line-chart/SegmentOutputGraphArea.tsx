import { useContext, useMemo } from 'react';
import { Colors, WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { TimePeriod, useGetOutputForSegmentQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { FLEXIBLE_GRAPH_AREA_PADDING, GRAPH_HEIGHT } from 'ui/constants';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { WhyLabsText } from 'components/design-system';
import SimpleLineVisxChart from './SimpleLineVisxChart';
import { getNoDataMessage } from '../vizutils/cardMessages';
import NoDataChart from '../no-data-chart/NoDataChart';

const SegmentOutputGraphArea: React.FC = () => {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { classes: commonStyles } = useCommonStyles();
  const pt = usePageTypeWithParams();
  const { segment } = pt;
  if (segment.tags.length === 0) {
    console.error(
      `The segment feature list table control shouldn't be used on pagetype ${pt.pageType}, which has no tags.`,
    );
  }
  const { loading, error, data } = useGetOutputForSegmentQuery({
    variables: {
      model: pt.modelId,
      tags: segment.tags,
      ...dateRange,
    },
    skip: loadingDateRange,
  });

  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  if (cardState.decorationType !== 'output_count') {
    cardStateDispatch({ decorationType: 'output_count' });
  }

  const renderLoading = () => (
    <div style={{ alignSelf: 'center', justifySelf: 'center', textAlign: 'center' }}>Loading...</div>
  );

  const datedData = useMemo(
    () =>
      data?.model?.segment?.batches.map((b) => {
        const values = [b.outputCount, b.inputCount];
        const labels = ['Output', 'Input'];
        const colors = [Colors.chartPrimary, Colors.chartOrange];
        values.unshift(b.sketches?.results?.[0]?.totalCount ?? 0);
        labels.unshift(pt.outputName);
        colors.unshift(Colors.purple);
        return {
          dateInMillis: b.timestamp,
          values,
          labels,
          colors,
        };
      }) || [],
    [data?.model?.segment?.batches, pt.outputName],
  );

  const batchFrequency = data?.model?.batchFrequency ?? TimePeriod.P1D;
  const renderGraphs = () => {
    const noDataMessage = getNoDataMessage(data?.model?.segment?.batches.length || 0, 'output');
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <WhyLabsAutoSizer disableHeight>
          {({ width }) => {
            const graphWidth = width - FLEXIBLE_GRAPH_AREA_PADDING;
            return (
              <div style={{ width }}>
                {noDataMessage ? (
                  <NoDataChart noDataMessage={noDataMessage} />
                ) : (
                  <SimpleLineVisxChart
                    datedData={datedData}
                    height={GRAPH_HEIGHT}
                    width={graphWidth}
                    batchFrequency={batchFrequency}
                    secondaryGraphLabel={`${pt.outputName} count`}
                  />
                )}
              </div>
            );
          }}
        </WhyLabsAutoSizer>
      </div>
    );
  };

  const renderError = () => (
    <WhyLabsText inherit className={commonStyles.commonFont}>
      An error has occurred!
    </WhyLabsText>
  );
  return (
    <>
      {error && renderError()}
      {loading && renderLoading()}
      {!error && !loading && renderGraphs()}
    </>
  );
};

export default SegmentOutputGraphArea;
