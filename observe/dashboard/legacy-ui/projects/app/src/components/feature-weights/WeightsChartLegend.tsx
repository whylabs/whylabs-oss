import { WeightsChartLegendProps } from './FeatureWeightsTypes';
import { getSizePixels, useWeightsChartLegendStyles } from './useFeatureWeightsCSS';

export const WeightsChartLegend: React.FC<WeightsChartLegendProps> = ({ colorScheme, size = 'md' }) => {
  const { classes } = useWeightsChartLegendStyles({ size });
  return (
    <div className={classes.chartLegendContainer}>
      <div className={classes.barChartColorSample} style={{ backgroundColor: colorScheme.positive.bgColor }} />
      <span className={classes.legendLabel}>Positive values</span>
      <div
        className={classes.barChartColorSample}
        style={{
          marginLeft: `${getSizePixels(size)}px`,
          backgroundColor: colorScheme.negative.bgColor,
        }}
      />
      <span className={classes.legendLabel}>Negative values</span>
    </div>
  );
};
