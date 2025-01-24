import { useContext, useMemo } from 'react';
import { Colors, WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import { useModelOutput } from 'hooks/useModelOutput';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { FLEXIBLE_GRAPH_AREA_PADDING, GRAPH_HEIGHT } from 'ui/constants';
import { TimePeriod } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { WhyLabsText } from 'components/design-system';
import SimpleLineVisxChart from './SimpleLineVisxChart';
import { getNoDataMessage } from '../vizutils/cardMessages';
import NoDataChart from '../no-data-chart/NoDataChart';

const OutputGraphArea: React.FC = () => {
  const { outputName } = usePageTypeWithParams();
  const { classes: commonStyles } = useCommonStyles();
  const { loading, error, data } = useModelOutput(outputName);
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  if (cardState.decorationType !== 'output_count') {
    cardStateDispatch({ decorationType: 'output_count' });
  }

  const renderLoading = () => (
    <div style={{ alignSelf: 'center', justifySelf: 'center', textAlign: 'center' }}>Loading...</div>
  );

  const datedData = useMemo(
    () =>
      data?.model?.batches.map((b) => {
        const values = [b.outputCount, b.inputCount];
        const labels = ['Output', 'Input'];
        const colors = [Colors.chartPrimary, Colors.chartOrange];
        values.unshift(b.sketches?.results?.[0]?.totalCount ?? 0);
        labels.unshift(outputName);
        colors.unshift(Colors.purple);
        return {
          dateInMillis: b.timestamp,
          values,
          labels,
          colors,
        };
      }) || [],
    [data?.model?.batches, outputName],
  );
  const batchFrequency = data?.model?.batchFrequency ?? TimePeriod.P1D;

  const renderGraphs = () => {
    const noDataMessage = getNoDataMessage(data?.model?.batches.length || 0, 'output');
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
                    secondaryGraphLabel={`${outputName} count`}
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

export default OutputGraphArea;
