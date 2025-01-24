import { useState } from 'react';
import { createStyles } from '@mantine/core';
import { FullTabCard } from 'components/cards/full-tab-card';
import { Colors, WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import MetadataStack from 'components/cards/full-tab-card/MetadataStack';
import { TimePeriod, AnalysisDataFragment } from 'generated/graphql';
import { ApolloError } from '@apollo/client';
import NoLegendTimeSeries from 'components/visualizations/no-legend-timeseries/NoLegendTimeSeries';
import NoDataChart from 'components/visualizations/no-data-chart/NoDataChart';
import { WhyLabsText } from 'components/design-system';
import MonitoringMonitorDropdown from 'components/feature-monitor-dropdown/MonitoringMonitorDropdown';
import PerformanceLegendItem from './PerformanceLegendItem';

const useStyles = createStyles((theme) => ({
  longContainer: {
    marginRight: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  longGraphContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 0,
    minHeight: '100%',
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    minWidth: '100%',
  },
  longGraphMessage: {
    fontFamily: 'Asap',
    fontSize: 16,
    fontWeight: 400,
    color: Colors.brandSecondary700,
  },
  compareLegend: {
    display: 'flex',
    flexDirection: 'column',
  },
}));

const METADATA_MAX_WIDTH = 250;

interface ChartData {
  label: string;
  values: (number | null)[];
  color: string;
  datasetName?: string;
}

interface MultiMetricLongCardProps {
  data: ChartData[];
  id?: string;
  timestamps: number[];
  error: ApolloError | undefined;
  loading: boolean;
  heroText: string | undefined;
  heroTimestamp?: number;
  title: string;
  noDataMessage?: string;
  batchFrequency: TimePeriod | undefined;
  isPercentage?: boolean;
  decimals?: number;
  heroWidth?: number;
  anomalies?: AnalysisDataFragment[] | undefined | null;
  showMonitorDropdown?: boolean;
  cardKey?: string;
}

const MultiMetricLongCard: React.FC<MultiMetricLongCardProps> = ({
  data,
  id,
  error,
  loading,
  heroText,
  heroTimestamp,
  title,
  timestamps,
  isPercentage = false,
  heroWidth = 250,
  decimals,
  noDataMessage = 'No data to display for the selected time period.',
  batchFrequency,
  anomalies,
  showMonitorDropdown,
  cardKey,
}) => {
  const { classes: styles } = useStyles();
  const [analyzer, setAnalyzer] = useState('');

  const graphSplit = (width: number, isLeft: boolean): number => {
    const max_width = Math.max(METADATA_MAX_WIDTH, heroWidth);
    return isLeft ? max_width : width - max_width;
  };

  const dataAvailable = data.find((d) => d.values.length > 0);

  return (
    <div id={id} style={{ flex: '1 0 auto' }} className={styles.longContainer}>
      <WhyLabsAutoSizer disableHeight>
        {({ width }) => (
          <FullTabCard width={width} height={220} first>
            <div className={styles.longGraphContainer}>
              <MetadataStack
                width={graphSplit(width, true)}
                minWidth={140}
                title={title}
                timestamp={heroTimestamp}
                heroText={heroText}
              >
                <div className={styles.compareLegend}>
                  {data &&
                    data.map((dataset) => {
                      return (
                        <PerformanceLegendItem
                          key={`performance-legend-${title}-${dataset.label}-${dataset.datasetName ?? ''}`}
                          color={dataset.color}
                          label={dataset.label}
                          datasetName={dataset.datasetName}
                        />
                      );
                    })}
                </div>
                {showMonitorDropdown && (
                  <MonitoringMonitorDropdown
                    width={200}
                    showCreateMonitorButton={false}
                    analysisResults={anomalies ?? []}
                    setAnalyzer={setAnalyzer}
                    analyzer={analyzer}
                    column
                    analyzerRecoilKey={`${cardKey}--multiple`}
                    cardType="multiple"
                  />
                )}
              </MetadataStack>
              {dataAvailable && (
                <NoLegendTimeSeries
                  height={190}
                  width={graphSplit(width, false)}
                  name={title}
                  timestamps={timestamps}
                  data={data}
                  alerts={anomalies?.filter((a) => a.analyzerId === analyzer) ?? []}
                  batchFrequency={batchFrequency || TimePeriod.P1D}
                  percentage={isPercentage}
                  decimals={decimals}
                  splitWidth={graphSplit(width, true)}
                />
              )}
              {!dataAvailable && loading && (
                <div className={styles.messageWrapper}>
                  <WhyLabsText inherit className={styles.longGraphMessage}>
                    Loading...
                  </WhyLabsText>
                </div>
              )}
              {!dataAvailable && !loading && !error && <NoDataChart noDataMessage={noDataMessage} />}
              {!dataAvailable && !loading && error && (
                <div className={styles.messageWrapper}>
                  <WhyLabsText inherit className={styles.longGraphMessage}>
                    Error fetching performance data.
                  </WhyLabsText>
                </div>
              )}
            </div>
          </FullTabCard>
        )}
      </WhyLabsAutoSizer>
    </div>
  );
};

export default MultiMetricLongCard;
