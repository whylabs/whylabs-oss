import React, { useCallback } from 'react';
import { Container, Typography } from '@material-ui/core';
import { Line, LineChart, Tooltip, XAxis } from 'recharts';
import { format } from 'date-fns-tz';
import { Colors } from '../constants/colors';

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
  isHourly?: boolean;
  syncId?: string;
  hoveredRow?: number;
  keyIndex?: number;
};

export const SparklineChart = <T extends Record<string, unknown>>({
  className,
  data,
  isAlert,
  dataAccessor,
  tooltipDecimals = 0,
  labelingProp,
  isHourly = false,
  syncId = Math.random().toString(),
  hoveredRow,
  keyIndex,
}: SparklineChartProps<T>): JSX.Element => {
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
        labelFormatter={(date) => date && (isHourly ? format(date, 'MM/dd HH:mm') : format(date, 'MM/dd'))}
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
      <Container className={className} style={{ paddingLeft: 18, paddingRight: 0 }}>
        <Typography
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            paddingLeft: '4px',
            color: Colors.brandSecondary500,
            fontStyle: 'italic',
          }}
        >
          {generateInsufficientDataString()}
        </Typography>
      </Container>
    );
  }

  return (
    <Container className={className} style={{ padding: '5px 5px 5px 18px' }}>
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
    </Container>
  );
};
