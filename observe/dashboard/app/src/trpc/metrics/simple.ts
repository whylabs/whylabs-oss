import { TimePeriod } from '../../graphql/generated/graphql';
import { compareAndReturnHigherTimePeriod } from '../../util/time-period-utils';
import { ChartUnion } from '../dashboard/types/dashboards';
import { router, viewDataProcedureWithDateInterval } from '../trpc';
import { doSimplePieMetricsQuery } from './pieMetrics';
import { doSimpleTimeseriesMetricsQuery } from './timeseriesMetrics';
import { ColumnSeries, PieSeries } from './types/simpleMetricsTypes';

type ReturnSeriesUnion = ColumnSeries | PieSeries;

type GetListReturnType = {
  series: Array<ReturnSeriesUnion>;
  timePeriod?: TimePeriod;
};

type QueryType = {
  chart: ChartUnion;
};

const simple = router({
  getList: viewDataProcedureWithDateInterval
    .input((object: unknown) => object as QueryType)
    .query(async ({ input: { chart, ...rest }, ctx }): Promise<GetListReturnType> => {
      if ('pie' in chart) {
        const result = await Promise.all(chart.pie.map((pie) => doSimplePieMetricsQuery({ ...rest, ...pie }, ctx)));

        const series: PieSeries[] = [];
        result.forEach(({ series: s }) => {
          if (s) series.push(s);
        });

        return { series };
      } else if ('timeseries' in chart) {
        const result = await Promise.all(
          chart.timeseries.map((timeseries) => doSimpleTimeseriesMetricsQuery({ ...rest, ...timeseries }, ctx)),
        );

        const series: ColumnSeries[] = [];
        let higherBatchFrequency: TimePeriod = TimePeriod.Pt1H;

        result.forEach(({ series: d, timePeriod }) => {
          series.push(...d);

          if (timePeriod) {
            higherBatchFrequency = compareAndReturnHigherTimePeriod(timePeriod, higherBatchFrequency);
          }
        });

        return { series, timePeriod: higherBatchFrequency };
      }

      // TODO: Implement for other chart types in the future
      return { series: [] };
    }),
});

export default simple;
