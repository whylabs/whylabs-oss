import { useCallback } from 'react';
import { createStyles } from '@mantine/core';
import { Line, LineChart, Tooltip, XAxis } from 'recharts';
import { Colors } from '@whylabs/observatory-lib';
import { timeShort } from 'utils/dateUtils';
import { TimePeriod } from 'generated/graphql';
import { useElementSize } from 'hooks/useElementSize';
import { isExactlyNullOrUndefined } from 'utils/nullUtils';
import { WhyLabsText } from 'components/design-system';

const SPARK_WIDTH = 148;
const SPARK_HEIGHT = 34;

const SPARK_STANDARD_COLOR = Colors.chartPrimary;
const SPARK_ALERT_COLOR = Colors.red;

type SparklineChartProps<T extends Record<string, unknown>> = {
  data: ReadonlyArray<T>;
  dataAccessor(item: T): number;
  isAlert?: boolean;
  className?: string;
  tooltipDecimals?: number;
  labelingProp?: string;
  batchFrequency?: TimePeriod;
  syncId?: string;
  hoveredRow?: number;
  keyIndex?: number;
  noDataMessage?: string;
  notEnoughDataMessage?: string;
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

const DEFAULT_NO_DATA_MESSAGE = 'No data available';
const DEFAULT_NOT_ENOUGH_DATA_MESSAGE = 'Insufficient data';

export const SparklineChart = <T extends Record<string, unknown>>({
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
  noDataMessage = DEFAULT_NO_DATA_MESSAGE,
  notEnoughDataMessage = DEFAULT_NOT_ENOUGH_DATA_MESSAGE,
}: SparklineChartProps<T>): JSX.Element => {
  const [containerRef, { width: containerWidth }] = useElementSize();
  const { classes: chartStyles } = useChartStyles();

  const generateInsufficientDataString = useCallback((): string => {
    if (data.length === 0) {
      return noDataMessage;
    }
    return notEnoughDataMessage;
  }, [data.length, noDataMessage, notEnoughDataMessage]);

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
    if (hoveredRow !== undefined && keyIndex !== undefined && hoveredRow !== keyIndex) {
      return <Tooltip content={<div />} />;
    }

    return (
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
        formatter={(value) => (isExactlyNullOrUndefined(value) ? 'No data' : formatNumberLabel(value as number))}
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
    <div className={className} ref={containerRef} style={{ padding: '5px 5px 5px 18px' }}>
      <LineChart width={getChartWidth()} height={SPARK_HEIGHT} data={data} syncId={syncId}>
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

  function getChartWidth() {
    const chartWidth = containerWidth - 20;
    if (chartWidth > SPARK_WIDTH) return chartWidth;

    return SPARK_WIDTH;
  }
};
