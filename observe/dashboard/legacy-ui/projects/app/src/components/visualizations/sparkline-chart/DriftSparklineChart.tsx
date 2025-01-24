import { useCallback } from 'react';
import { Line, LineChart, Tooltip, XAxis } from 'recharts';
import { Colors } from '@whylabs/observatory-lib';
import { timeShort } from 'utils/dateUtils';
import { ExpandedData } from 'utils/expandTableData';
import { TimePeriod } from 'generated/graphql';
import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';

const SPARK_WIDTH = 148;
const SPARK_HEIGHT = 34;

const SPARK_STANDARD_COLOR = Colors.chartPrimary;
const SPARK_ALERT_COLOR = Colors.red;

type DriftSparklineChartProps = {
  data: ReadonlyArray<ExpandedData>;
  dataAccessor(item: ExpandedData): number;
  isAlert?: boolean;
  className?: string;
  tooltipDecimals?: number;
  labelingProp?: string;
  batchFrequency?: TimePeriod;
  syncId?: string;
  hoveredRow?: number;
  keyIndex?: number;
};
const useChartStyles = createStyles({
  noDataText: {
    fontSize: 12,
    lineHeight: 1.5,
    paddingLeft: '4px',
    color: Colors.brandSecondary500,
    fontStyle: 'italic',
    fontFamily: 'Inconsolata',
  },
});

export const DriftSparklineChart = ({
  className,
  data,
  isAlert,
  dataAccessor,
  tooltipDecimals = 0,
  labelingProp,
  batchFrequency,
  syncId = Math.random().toString(),
  hoveredRow,
  keyIndex,
}: DriftSparklineChartProps): JSX.Element => {
  const { classes: chartStyles } = useChartStyles();
  const generateInsufficientDataString = useCallback((): string => {
    if (data.length === 0) {
      return 'No data available';
    }
    return 'Insufficient data';
  }, [data.length]);

  const formatNumberLabel = useCallback(
    (val: number) => {
      if (val >= 0.01 || val === 0) {
        return val.toFixed(tooltipDecimals);
      }
      return val.toExponential(1);
    },
    [tooltipDecimals],
  );

  const renderTooltip = () => {
    return hoveredRow !== undefined && keyIndex !== undefined && hoveredRow !== keyIndex ? (
      <Tooltip content={<div />} />
    ) : (
      <Tooltip
        separator=""
        contentStyle={{
          backgroundColor: Colors.tooltipBackgroundRGBA,
          padding: '3px 4px',
          fontFamily: 'Asap, Roboto, sans-serif',
          borderRadius: 5,
          border: 'none',
        }}
        labelStyle={{
          display: !labelingProp && 'none',
          fontWeight: 600,
          color: Colors.white,
          fontSize: 10,
          lineHeight: 1,
        }}
        labelFormatter={(date) => date && timeShort(date as number, batchFrequency)}
        itemStyle={{
          fontWeight: 600,
          padding: 0,
          color: Colors.white,
          fontSize: 12,
          lineHeight: 1,
        }}
        formatter={(value) => formatNumberLabel(value as number)}
        filterNull={false}
      />
    );
  };
  if (data.length < 2) {
    return (
      <div className={className} style={{ paddingLeft: 18, paddingRight: 0 }}>
        <WhyLabsText inherit className={chartStyles.noDataText}>
          {generateInsufficientDataString()}
        </WhyLabsText>
      </div>
    );
  }

  return (
    <div className={className} style={{ padding: '5px 5px 5px 18px' }}>
      <LineChart width={SPARK_WIDTH} height={SPARK_HEIGHT} data={data} syncId={syncId}>
        {renderTooltip()}
        <Line
          type="monotone"
          dataKey={dataAccessor}
          dot={false}
          isAnimationActive={false}
          stroke={isAlert ? SPARK_ALERT_COLOR : SPARK_STANDARD_COLOR}
          strokeWidth={isAlert ? 2 : 1}
        />
        {labelingProp && <XAxis dataKey={labelingProp} hide />}
      </LineChart>
    </div>
  );
};
