import { createStyles } from '@mantine/core';
import { Colors, chartColorForIndex } from '~/assets/Colors';
import { WhyLabsBadge } from '~/components/design-system';
import { isValidNumber } from '~/utils/numberUtils';
import { segmentStringToTags, segmentTagsToString } from '~/utils/segments';
import { AnalysisMetric, TimePeriod } from '~server/graphql/generated/graphql';
import {
  ChartUnion,
  CustomDashboardDateRange,
  CustomDashboardWidgets,
  DashboardDateRangeType,
} from '~server/trpc/dashboard/types/dashboards';
import {
  PieChartQuery,
  TimeseriesLlmQuery,
  TimeseriesMonitorQuery,
  TimeseriesProfileQuery,
  TimeseriesQueryUnion,
} from '~server/trpc/dashboard/types/queries';
import { timePeriodToTimeUnit } from '~server/util/time-period-utils';
import { ReactElement, ReactNode } from 'react';

import { ChartBuilderObject, DashboardWidgetObject, ReadyToQueryChartPlot } from './types';

const DEFAULT_HEIGHT = 36;
export const useGraphBuilderStyles = createStyles(() => ({
  root: {
    alignItems: 'start',
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
    width: '100%',
  },
  colorDisplay: {
    borderRadius: 4,
    height: DEFAULT_HEIGHT,
    width: 4,
  },
  actionIcon: {
    height: DEFAULT_HEIGHT,
    width: 24,
    '&:active': {
      transform: 'unset',
    },
  },
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  resourceSelectFlex: {
    display: 'flex',
    alignItems: 'end',
    gap: 6,
  },
  resourceSelectWrapper: {
    minWidth: 240,
  },
  displayNameWrapper: {
    minWidth: 250,
    flex: 1,
  },
  metricSelectWrapper: {
    minWidth: 240,
  },
  segmentSelectWrapper: {
    minWidth: 320,
    maxWidth: 500,
    flex: 2,
  },
  columnSelectWrapper: {
    minWidth: 240,
  },
  plotActions: {
    display: 'flex',
    justifyContent: 'end',
    width: 100,
  },
  labelSpace: {
    paddingTop: 24,
  },
  optionalSpan: {
    fontSize: 12,
    fontWeight: 400,
  },
  notApplicableText: {
    fontSize: 13,
    lineHeight: '36px', // same height as a select input
    marginLeft: 12,
    top: 8,
  },
  notApplicableLabel: {
    paddingTop: 3,
    fontSize: 14,
    lineHeight: 1.55,
    color: Colors.brandSecondary900,
    fontWeight: 600,
  },
  notApplicableFlex: {
    display: 'flex',
    flexDirection: 'column',
  },
}));

export const convertCustomDashboardToChartBuilderObject = (
  charts: CustomDashboardWidgets[],
): DashboardWidgetObject[] => {
  const list: DashboardWidgetObject[] = [];

  charts.forEach((s) => {
    const { displayName, id } = s;

    if (s.type === 'pie') {
      list.push({
        displayName,
        id,
        plots: s.pie.map(convertPieQueryToChartBuilderPlot),
        type: 'pie',
      });
    }
    if (s.type === 'timeseries') {
      list.push({
        displayName,
        id,
        plots: s.timeseries.map(convertTimeseriesQueryToChartBuilderPlot),
        type: 'timeseries',
      });
    }
    if (s.type === 'dataComparison' || s.type === 'metricComparison') {
      list.push(s);
    }
  });

  return list;
};

const convertPieQueryToChartBuilderPlot = ({
  queryId,
  segment,
  source,
  ...rest
}: PieChartQuery): ReadyToQueryChartPlot => {
  return {
    ...rest,
    id: queryId,
    metric: 'Frequent Items',
    metricSource: 'Frequent Items',
    segment: segmentTagsToString(segment),
    type: 'pie',
  };
};

const convertTimeseriesProfileQueryToChartBuilderPlot = ({
  queryId,
  segment,
  source,
  ...rest
}: TimeseriesProfileQuery): ReadyToQueryChartPlot => {
  return {
    ...rest,
    id: queryId,
    metricSource: source,
    segment: segmentTagsToString(segment),
    type: 'timeseries',
  };
};

const convertTimeseriesLlmQueryToChartBuilderPlot = ({
  queryId,
  source,
  ...rest
}: TimeseriesLlmQuery): ReadyToQueryChartPlot => {
  return {
    ...rest,
    id: queryId,
    metricSource: source,
    segment: '',
    type: 'timeseries',
  };
};

const convertTimeseriesMonitorQueryToChartBuilderPlot = ({
  queryId,
  source,
  ...rest
}: TimeseriesMonitorQuery): ReadyToQueryChartPlot => {
  return {
    ...rest,
    id: queryId,
    metricSource: source,
    segment: '',
    type: 'timeseries',
  };
};

export const convertTimeseriesQueryToChartBuilderPlot = (query: TimeseriesQueryUnion): ReadyToQueryChartPlot => {
  if (query.source === 'Profiles') {
    return convertTimeseriesProfileQueryToChartBuilderPlot(query);
  }
  if (query.source === 'LLM') {
    return convertTimeseriesLlmQueryToChartBuilderPlot(query);
  }

  return convertTimeseriesMonitorQueryToChartBuilderPlot(query);
};

const convertChartBuilderPlotToTimeseriesProfileQuery = ({
  id,
  metric,
  segment,
  ...rest
}: ReadyToQueryChartPlot): TimeseriesProfileQuery => ({
  ...rest,
  queryId: id,
  metric: metric as AnalysisMetric,
  segment: segmentStringToTags(segment),
  source: 'Profiles',
  unit: 'count',
});

const convertChartBuilderPlotToTimeseriesLlmQuery = ({
  id,
  metric,
  segment,
  ...rest
}: ReadyToQueryChartPlot): TimeseriesLlmQuery => ({
  ...rest,
  queryId: id,
  metric,
  source: 'LLM',
  unit: 'count',
});

const convertChartBuilderPlotToTimeseriesMonitorQuery = ({
  id,
  segment,
  ...rest
}: ReadyToQueryChartPlot): TimeseriesMonitorQuery => ({
  ...rest,
  queryId: id,
  segment: segmentStringToTags(segment),
  source: 'Monitors',
  unit: 'count',
});

export const convertChartBuilderPlotsToTimeseriesQuery = (plots: ReadyToQueryChartPlot[]): TimeseriesQueryUnion[] => {
  return plots.map(({ color, ...rest }, index) => {
    const plot = {
      color: color ?? chartColorForIndex(index),
      ...rest,
    };

    if (plot.metricSource === 'Profiles') {
      return convertChartBuilderPlotToTimeseriesProfileQuery(plot);
    }

    if (plot.metricSource === 'LLM') {
      return convertChartBuilderPlotToTimeseriesLlmQuery(plot);
    }

    return convertChartBuilderPlotToTimeseriesMonitorQuery(plot);
  });
};

export const convertChartBuilderPlotsToPieQuery = (plots: ReadyToQueryChartPlot[]): PieChartQuery[] => {
  return plots.map(({ color, id, metricSource, segment, ...rest }, index) => {
    const plot = {
      color: color ?? chartColorForIndex(index),
      ...rest,
    };

    return {
      ...plot,
      queryId: id,
      segment: segmentStringToTags(segment),
      source: 'Frequent Items',
      unit: 'percentage',
    };
  });
};

export const convertChartBuilderObjectToChartUnion = ({ plots, type, ...rest }: ChartBuilderObject): ChartUnion => {
  if (type === 'pie') {
    return {
      ...rest,
      pie: convertChartBuilderPlotsToPieQuery(plots),
      type: 'pie',
    };
  }

  return {
    ...rest,
    timeseries: convertChartBuilderPlotsToTimeseriesQuery(plots),
    type: 'timeseries',
  };
};

type CommonGrayBadgeProps = {
  children: ReactNode;
  classNames?: string;
};

const useStyles = createStyles({
  dateRangeCellContainer: {
    display: 'flex',
    gap: 5,
  },
  badge: {
    color: Colors.secondaryLight1000,
    '& *': {
      fontFamily: 'Inconsolata',
    },
    height: 24,
    borderRadius: '18px',
    fontSize: 13,
    fontWeight: 400,
    letterSpacing: '-0.13px',
    lineHeight: '14px',
  },
  grayBadge: {
    background: Colors.secondaryLight200,
  },
  blueBadge: {
    background: Colors.brandPrimary200,
  },
});

const FixedRangeBadge = ({ rangeLabel }: { rangeLabel: boolean }) => {
  const { classes, cx } = useStyles();
  return (
    <WhyLabsBadge className={cx(classes.badge, classes.blueBadge)}>Fixed{rangeLabel ? ' range' : ''}</WhyLabsBadge>
  );
};

export const CommonGrayBadge = ({ children, classNames }: CommonGrayBadgeProps) => {
  const { classes, cx } = useStyles();
  return <WhyLabsBadge className={cx(classes.badge, classes.grayBadge, classNames)}>{children}</WhyLabsBadge>;
};

export const renderFixedDateRangeBadge = (
  startDate: string,
  endDate: string,
  rangeLabel: boolean,
  rangeBadgeOnly?: boolean,
  displayUTC?: boolean,
  labelClassName?: string,
) => {
  const rangeString = `${startDate.substring(0, 10)} to ${endDate.substring(0, 10)}`;
  return (
    <>
      {!rangeBadgeOnly && <FixedRangeBadge rangeLabel={rangeLabel} />}
      <CommonGrayBadge classNames={labelClassName}>
        {rangeString}
        {displayUTC ? ' UTC' : ''}
      </CommonGrayBadge>
    </>
  );
};

export const renderRelativeDateRangeBadge = (
  timePeriod: TimePeriod,
  size: number,
  rangeLabel: boolean,
  rangeBadgeOnly?: boolean,
  labelClassName?: string,
) => {
  const timeUnit = timePeriodToTimeUnit.get(timePeriod) ?? '';
  const rangeString = `Last ${size} ${timeUnit}`;
  if (!isValidNumber(size)) return <></>;
  return (
    <>
      {!rangeBadgeOnly && <CommonGrayBadge>Live{rangeLabel ? ' range' : ''}</CommonGrayBadge>}
      <CommonGrayBadge classNames={labelClassName}>{rangeString}</CommonGrayBadge>
    </>
  );
};

export const DashboardDateRangeBadge = ({
  dateRange,
  rangeLabel = false,
  rangeBadgeOnly,
  displayUTC,
  labelClassName,
}: {
  dateRange: CustomDashboardDateRange;
  rangeLabel?: boolean;
  rangeBadgeOnly?: boolean;
  displayUTC?: boolean;
  labelClassName?: string;
}): ReactElement => {
  const { classes } = useStyles();
  const isFixedRange = dateRange.type === DashboardDateRangeType.fixed;
  return (
    <div className={classes.dateRangeCellContainer}>
      {isFixedRange
        ? renderFixedDateRangeBadge(
            dateRange.startDate,
            dateRange.endDate,
            rangeLabel,
            rangeBadgeOnly,
            displayUTC,
            labelClassName,
          )
        : renderRelativeDateRangeBadge(
            dateRange.timePeriod,
            dateRange.size,
            rangeLabel,
            rangeBadgeOnly,
            labelClassName,
          )}
    </div>
  );
};
