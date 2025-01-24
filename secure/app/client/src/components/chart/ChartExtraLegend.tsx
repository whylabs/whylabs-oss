import { Skeleton, createStyles } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { useCallback, useEffect } from 'react';
import { Colors } from '~/assets/Colors';
import { displayNumber } from '~/utils/numberUtils';

import { InvisibleButton } from '../misc/InvisibleButton';
import { getChartById } from './utils/hcplaceholderUtils';

type StyleProps = {
  color: string;
  isDisabled?: boolean;
};

const useStyles = createStyles((_, { color, isDisabled }: StyleProps) => ({
  root: {
    alignItems: 'end',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    color: Colors.secondaryLight1000,
    fontSize: 12,
    textWrap: 'nowrap',
  },
  value: {
    color,
    fontSize: 24,
    textDecoration: isDisabled ? 'line-through' : 'none',
    textWrap: 'nowrap',
  },
}));

export type ChartExtraLegendProps = StyleProps & {
  chartId: string;
  isLoading?: boolean;
  name: string;
  seriesId: string;
  value: number | string;
};

export const ChartExtraLegend = ({
  chartId,
  color,
  isLoading,
  isDisabled,
  name,
  seriesId,
  value,
}: ChartExtraLegendProps) => {
  const { classes } = useStyles({ color, isDisabled });
  const { hovered, ref } = useHover();

  const onHover = useCallback(
    (isHovered: boolean) => {
      const chart = getChartById(chartId);
      if (!chart?.series) return;

      chart.series.forEach((s) => {
        if (isHovered && s.userOptions.id !== seriesId) {
          // Disable the other series when hovering over a legend to mimic the behavior of the HCPlaceholder library
          s.setState('inactive');
        } else {
          s.setState('normal');
        }
      });
    },
    [chartId, seriesId],
  );

  useEffect(() => {
    onHover(hovered);
  }, [hovered, onHover]);

  const renderValue = () => {
    if (isLoading) return <Skeleton height={22} width={30} />;

    if (typeof value === 'string') return value;

    return displayNumber(value);
  };

  const onClick = () => {
    const chart = getChartById(chartId);
    if (!chart?.series) return;

    const seriesToUpdate = chart.series.find((s) => s.userOptions.id === seriesId);
    if (seriesToUpdate) {
      seriesToUpdate.setVisible(!seriesToUpdate.visible);
    }
  };

  return (
    <InvisibleButton onClick={onClick}>
      <div className={classes.root} data-testid="ChartExtraLegend" ref={ref}>
        <span className={classes.label}>{name}</span>
        <span className={classes.value}>{renderValue()}</span>
      </div>
    </InvisibleButton>
  );
};
