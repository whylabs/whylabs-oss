import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { SeriesOptionsType } from 'hcplaceholder';
import { HCPlaceholderHeatMap } from './HCPlaceholderHeatMap';
import { SquareGraphTitleBar } from '../components/SquareGraphTitleBar';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
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
  chart: {
    height: '100%',
    width: '100%',
  },
});

interface HeatMapViewProps {
  isLoading: boolean;
  labels: string[];
  data: number[][];
  info: string;
  bumpProfile: (increase: boolean) => void;
  hasNextProfile: () => boolean;
  hasPreviousProfile: () => boolean;
}

const CONFUSION_MATRIX_TITLE = 'Confusion matrix';

export function HeatMapView({
  isLoading,
  labels,
  data,
  info,
  bumpProfile,
  hasNextProfile,
  hasPreviousProfile,
}: HeatMapViewProps): JSX.Element {
  const { classes } = useStyles();
  // Convert the data from our server to the hcplaceholder heatmap format
  const seriesData = data.reduce<number[][]>((acc, row, i) => {
    return acc.concat(row.map((value, j) => [j, i, value]));
  }, []);

  const seriesOptions: SeriesOptionsType[] = [
    {
      type: 'heatmap',
      name: 'Confusion matrix',
      data: seriesData,
      dataLabels: {
        enabled: true,
        color: '#000000',
        style: {
          fontFamily: 'Asap',
        },
      },
    },
  ];
  return (
    <div className={classes.root}>
      <SquareGraphTitleBar
        title={CONFUSION_MATRIX_TITLE}
        info={info}
        bumpProfile={bumpProfile}
        hasNextProfile={hasNextProfile}
        hasPreviousProfile={hasPreviousProfile}
      />
      <HCPlaceholderHeatMap
        isLoading={isLoading}
        labels={labels}
        series={seriesOptions}
        yAxisTitle="Predicted class"
        xAxisTitle="Actual class"
      />
    </div>
  );
}
