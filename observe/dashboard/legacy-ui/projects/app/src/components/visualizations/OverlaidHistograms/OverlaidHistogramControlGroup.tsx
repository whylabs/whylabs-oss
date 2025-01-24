import { createStyles, RangeSlider } from '@mantine/core';
import { useCallback, useState } from 'react';

import { Colors } from '@whylabs/observatory-lib';
import { HistogramDomain } from '../inline-histogram/histogramUtils';
import { OverlaidHistogramHighchart } from './OverlaidHistogramHighchart';
import { UnifiedHistogramWithMetadata } from './types';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  graphContainer: {},
  sliderContainer: {
    margin: '8px 0 16px',
    padding: '0 24px',
  },
  customRangeSlider: {
    label: {
      backgroundColor: 'tomato',
    },
  },
});

interface OverlaidHistogramControlGroupProps {
  graphHeight: number;
  graphWidth: number;
  allUnifiedBins: number[];
  graphVerticalBuffer: number;
  graphHorizontalBuffer: number;
  unifiedHistograms: UnifiedHistogramWithMetadata[];
  histogramDomain: HistogramDomain;
  histogramRange: HistogramDomain;
  compactView?: boolean;
}

function scaleFromPercentToValue(percent: number, domain: HistogramDomain): number {
  if (percent < 0 || percent > 100 || !domain.isValid) {
    return 0;
  }
  const { min, max } = domain;
  return min + ((max - min) * percent) / 100;
}

function valueLabelFormat(value: number): string {
  return `${value.toPrecision(3)}`;
}

export function OverlaidHistogramControlGroup({
  graphHeight,
  graphWidth,
  allUnifiedBins,
  graphVerticalBuffer,
  graphHorizontalBuffer,
  unifiedHistograms,
  histogramDomain,
  histogramRange,
  compactView,
}: OverlaidHistogramControlGroupProps): JSX.Element {
  const { classes } = useStyles();
  const [rangeValue, setRangeValue] = useState<[number, number]>([0, 100]);
  const rangeScale = useCallback(
    (value: number) => {
      return scaleFromPercentToValue(value, histogramDomain);
    },
    [histogramDomain],
  );

  return (
    <div className={classes.root}>
      <div className={classes.sliderContainer}>
        <RangeSlider
          value={rangeValue}
          onChange={setRangeValue}
          scale={rangeScale}
          label={valueLabelFormat}
          color="teal.7"
          styles={(theme) => {
            return {
              label: {
                backgroundColor: theme.colorScheme === 'dark' ? Colors.brandSecondary400 : Colors.brandSecondary600,
                wordBreak: 'break-word',
              },
            };
          }}
        />
      </div>
      <div className={classes.graphContainer}>
        <OverlaidHistogramHighchart
          unifiedHistograms={unifiedHistograms}
          allUnifiedBins={allUnifiedBins}
          graphHeight={graphHeight}
          graphWidth={graphWidth}
          graphHorizontalBuffer={graphHorizontalBuffer}
          graphVerticalBuffer={graphVerticalBuffer}
          histogramDomain={histogramDomain}
          histogramRange={histogramRange}
          compactView={compactView}
          viewXMin={rangeScale(rangeValue[0])}
          viewXMax={rangeScale(rangeValue[1])}
        />
      </div>
    </div>
  );
}
