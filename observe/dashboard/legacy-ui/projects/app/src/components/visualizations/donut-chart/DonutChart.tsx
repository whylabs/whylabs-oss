import { Colors } from '@whylabs/observatory-lib';
import { ComponentProps } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCategory } from 'generated/graphql';
import { createStyles } from '@mantine/core';

type DonutChartProps = {
  custom?: {
    container?: Partial<ComponentProps<typeof ResponsiveContainer>>;
    pie?: Omit<ComponentProps<typeof Pie>, 'data' | 'dataKey' | 'label'>;
    pieChart?: ComponentProps<typeof PieChart>;
  };
  data: ReadonlyArray<{ name: string; value: number; category: AlertCategory }>;
};

const categoryColors = new Map<AlertCategory, string>([
  [AlertCategory.Ingestion, Colors.alertStackedBarArray[0]],
  [AlertCategory.DataQuality, Colors.alertStackedBarArray[1]],
  [AlertCategory.DataDrift, Colors.alertStackedBarArray[2]],
  [AlertCategory.Performance, Colors.alertStackedBarArray[3]],
  [AlertCategory.Unknown, Colors.alertStackedBarArray[4]],
]);

const useStyles = createStyles(() => ({
  text: {
    fontSize: 12,
    margin: 0,
    padding: '0 2px',
    lineHeight: 1,
    color: Colors.brandSecondary900,
  },
}));

const DonutChart = ({ custom, data }: DonutChartProps): JSX.Element => {
  const { classes } = useStyles();
  return (
    <ResponsiveContainer height="100%" width="100%" {...custom?.container}>
      <PieChart {...custom?.pieChart}>
        <Pie
          data={data}
          dataKey="value"
          label={({ x, y, name }) => {
            const donutArea = y > 35 && y < 120;
            const width = donutArea ? 55 : 80;
            const leftLabel = x < 110;
            return (
              <foreignObject x={leftLabel ? x - width : x} y={y - 5} width={width} height={50}>
                <p className={classes.text} style={{ textAlign: leftLabel ? 'end' : 'start' }}>
                  {name}
                </p>
              </foreignObject>
            );
          }}
          {...custom?.pie}
        >
          {data.map(({ name, category }) => (
            <Cell key={`donut-cell-${name}`} fill={categoryColors.get(category) ?? Colors.alertStackedBarArray[4]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DonutChart;
