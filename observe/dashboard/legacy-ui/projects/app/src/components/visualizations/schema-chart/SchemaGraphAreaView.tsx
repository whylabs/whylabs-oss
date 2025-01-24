import { ApolloError } from '@apollo/client';
import { WhyLabsAutoSizer } from '@whylabs/observatory-lib';

import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';

import { GetInferredDataAnalysisQuery, TimePeriod } from 'generated/graphql';
import { useChartStyles } from 'hooks/useChartStyles';
import { useContext, useRef } from 'react';
import { DatedSchema } from 'utils/createDatedSchemas';
import { GRAPH_HEIGHT, FLEXIBLE_GRAPH_AREA_PADDING } from 'ui/constants';
import { WhyLabsText } from 'components/design-system';
import { getNoDataMessage } from '../vizutils/cardMessages';
import SchemaVisxChart from './SchemaVisxChart';
import NoDataChart from '../no-data-chart/NoDataChart';

interface SchemaGraphAreaViewProps {
  valueData: DatedSchema[];
  batchFrequency?: TimePeriod;
  anomaliesData?: GetInferredDataAnalysisQuery;
  totalLoading?: boolean;
  totalError?: ApolloError;
  isCorrelatedAnomalies: boolean;
  manualColumnId?: string;
  columnName: string;
}

const SchemaGraphAreaView: React.FC<SchemaGraphAreaViewProps> = ({
  valueData,
  batchFrequency = TimePeriod.P1D,
  anomaliesData = undefined,
  totalLoading = false,
  totalError = undefined,
  isCorrelatedAnomalies,
  manualColumnId,
  columnName,
}) => {
  const { classes: styles } = useChartStyles();
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  const firstLoad = useRef(true);

  if (firstLoad.current) {
    cardStateDispatch({ decorationType: 'inferred_data_type' });
    firstLoad.current = false;
  }

  const canDrawGraphs = !totalLoading && !totalError;

  const renderGraph = () => {
    const noDataMessage = getNoDataMessage(valueData.length, 'schema', false, columnName);

    if (noDataMessage) {
      return <NoDataChart noDataMessage={noDataMessage} />;
    }
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <WhyLabsAutoSizer disableHeight>
          {({ width }) => {
            const graphWidth = width - FLEXIBLE_GRAPH_AREA_PADDING;
            return (
              <div style={{ width: graphWidth }}>
                <SchemaVisxChart
                  decorationCardType={cardState.decorationType}
                  isCorrelatedAnomalies={isCorrelatedAnomalies}
                  data={valueData}
                  height={GRAPH_HEIGHT}
                  manualColumnId={manualColumnId}
                  width={graphWidth}
                  batchFrequency={batchFrequency}
                  anomalies={anomaliesData?.analysisResults?.filter((an) => an.analyzerId === cardState.analyzer)}
                />
              </div>
            );
          }}
        </WhyLabsAutoSizer>
      </div>
    );
  };

  return (
    <>
      {totalLoading && (
        <div style={{ alignSelf: 'center', justifySelf: 'center', textAlign: 'center' }}>Loading...</div>
      )}
      {totalError && (
        <WhyLabsText inherit className={styles.errorMessage}>
          An error occurred while fetching data
        </WhyLabsText>
      )}
      {canDrawGraphs && renderGraph()}
    </>
  );
};

export default SchemaGraphAreaView;
