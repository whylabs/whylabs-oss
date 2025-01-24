import { SeriesOptionsType } from 'hcplaceholder';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { isAllCaps } from 'utils/stringUtils';
import { UnitHCPlaceholderCurve } from './UnitHCPlaceholderCurve';
import { LineDatum } from '../vizutils/types';
import {
  generateReferenceCurveOptions,
  generateTooltipFormatter,
  ReferenceCurveOptions,
} from './referenceCurveOpsFactory';
import { SquareGraphTitleBar } from '../components/SquareGraphTitleBar';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  noDataRoot: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: '100%',
  },
  noDataDisplay: {
    position: 'relative',
    height: '100%',
    padding: '20% 10%',
    fontSize: 18,
    color: Colors.brandSecondary900,
  },
  titleBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: '8px',
    fontFamily: 'Asap',
  },
  titleText: {
    fontSize: 16,
    lineHeight: 1.2,
    color: Colors.brandSecondary900,
    fontWeight: 600,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 1.43,
    color: Colors.brandSecondary900,
    fontWeight: 400,
  },
});

interface SquareCurveViewProps {
  isLoading: boolean;
  data: LineDatum[];
  info: string;
  name: string;
  xAxisTitle: string;
  yAxisTitle: string;
  side: number;
  referenceCurveOptions?: ReferenceCurveOptions;
  bumpProfile: (increase: boolean) => void;
  hasNextProfile: () => boolean;
  hasPreviousProfile: () => boolean;
}

export function SquareCurveView({
  isLoading,
  data,
  info,
  name,
  xAxisTitle,
  yAxisTitle,
  referenceCurveOptions,
  bumpProfile,
  hasNextProfile,
  hasPreviousProfile,
}: SquareCurveViewProps): JSX.Element {
  const { classes } = useStyles();
  const seriesData = data.map((datum) => [datum.x, datum.y]);
  const referenceCurveSeriesOptions = generateReferenceCurveOptions(referenceCurveOptions);
  const seriesOptions: SeriesOptionsType[] = [
    {
      type: 'line',
      name,
      data: seriesData,
      color: Colors.chartPrimary,
      dataLabels: {
        enabled: false,
      },
    },
  ];

  const tooltipFormatter = generateTooltipFormatter(
    seriesData,
    !referenceCurveOptions ? 'default' : 'score-bucket',
    xAxisTitle,
    yAxisTitle,
    referenceCurveOptions?.dataLengthOverride,
  );
  if (referenceCurveOptions?.layer === 'top' && referenceCurveSeriesOptions) {
    seriesOptions.push(referenceCurveSeriesOptions);
  } else if (referenceCurveOptions?.layer === 'bottom' && referenceCurveSeriesOptions) {
    seriesOptions.unshift(referenceCurveSeriesOptions);
  }
  const hasData = seriesData.length > 0;
  const midSentenceName = isAllCaps(name) ? name : name.toLocaleLowerCase();

  const noDataText = `No ${midSentenceName} data available for ${info}`;
  return (
    <div className={hasData ? classes.root : classes.noDataRoot}>
      <SquareGraphTitleBar
        title={name}
        info={info}
        bumpProfile={bumpProfile}
        hasNextProfile={hasNextProfile}
        hasPreviousProfile={hasPreviousProfile}
      />
      {hasData ? (
        <UnitHCPlaceholderCurve
          series={seriesOptions}
          isLoading={isLoading}
          xAxisTitle={xAxisTitle}
          yAxisTitle={yAxisTitle}
          tooltipFormatter={tooltipFormatter}
        />
      ) : (
        <div className={classes.noDataDisplay}>{noDataText}</div>
      )}
    </div>
  );
}
