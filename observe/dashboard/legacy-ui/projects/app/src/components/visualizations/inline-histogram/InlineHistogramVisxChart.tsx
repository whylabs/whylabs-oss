import { scaleLinear } from '@visx/scale';
import { useMemo } from 'react';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { HistogramFieldsFragment } from 'generated/graphql';
import useTypographyStyles from 'styles/Typography';
import { createStyles } from '@mantine/core';
import { HistogramDomain } from './histogramUtils';

const useStyles = createStyles({
  dataUnavailable: {
    margin: 'auto',
    display: 'flex',
    alignItems: 'end',
  },
});

const INLINE_RANGE_BUFFER_RATIO = 0.1;

interface InlineHistogramVisxChartProps {
  name: string;
  color: string;
  graphHeight: number;
  graphWidth: number;
  graphVerticalBuffer: number;
  histogram: HistogramFieldsFragment | null | undefined;
  histogramDomain: HistogramDomain;
  histogramRange: HistogramDomain;
}

const InlineHistogramVisxChart: React.FC<InlineHistogramVisxChartProps> = ({
  name,
  color,
  graphHeight,
  graphWidth,
  graphVerticalBuffer,
  histogram,
  histogramDomain,
  histogramRange,
}) => {
  const { classes: typography } = useTypographyStyles();
  const { classes: styles, cx } = useStyles();
  const xMin = histogramDomain.min;
  const xMax = histogramDomain.max;
  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [0, graphWidth],
        round: true,
        domain: [xMin, xMax],
      }),
    [xMin, xMax, graphWidth],
  );

  const yMax = histogramRange.max;
  const rangeMax = graphHeight - graphVerticalBuffer;
  const yScale = useMemo(() => {
    const graphMaxY = Math.round(yMax * (1 + INLINE_RANGE_BUFFER_RATIO));
    return scaleLinear<number>({
      range: [graphHeight, graphVerticalBuffer],
      round: true,
      domain: [0, graphMaxY],
    }).nice();
  }, [graphHeight, graphVerticalBuffer, yMax]);

  if (!histogram || !histogramDomain.isValid || !histogramRange.isValid) {
    return <p className={cx(styles.dataUnavailable, typography.dataNotShownText)}>Histogram data unavailable</p>;
  }

  const renderBars = () =>
    histogram.counts.map((count, index) => {
      const barX = xScale(histogram.bins[index]) + 1;
      const barXend = index < histogram.bins.length - 1 ? xScale(histogram.bins[index + 1]) : barX + 5; // HACK DEFAULT FOR NOW
      const barHeight = rangeMax - yScale(count);
      const barY = rangeMax - barHeight; // TODO: potentially invert this
      return (
        <Bar
          key={`histogram-bar-${name}-${barX}`}
          x={barX}
          y={barY}
          width={barXend - barX}
          height={barHeight}
          fill={color}
        />
      );
    });

  return (
    <svg width={graphWidth} height={graphHeight}>
      <Group top={0} left={0}>
        {/* {renderShadowBars()} */}
        {renderBars()}
        {/* {renderHoverBars()} */}
      </Group>
    </svg>
  );
};

export default InlineHistogramVisxChart;
