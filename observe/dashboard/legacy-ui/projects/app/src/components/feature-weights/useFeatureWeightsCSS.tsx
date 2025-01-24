import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WeightsChartLegendProps } from './FeatureWeightsTypes';

type FeatureWeightsStylesProps = Pick<WeightsChartLegendProps, 'size'>;
export const getSizePixels = (size: WeightsChartLegendProps['size']): number => {
  if (size === 'md') return 16;
  return 10;
};
export const useWeightsChartLegendStyles = createStyles((theme, { size }: FeatureWeightsStylesProps) => ({
  chartLegendContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  barChartColorSample: {
    width: `${getSizePixels(size)}px`,
    height: `${getSizePixels(size)}px`,
    marginRight: '5px',
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.4,
    color: Colors.brandSecondary700,
    fontFamily: 'Asap',
  },
}));
