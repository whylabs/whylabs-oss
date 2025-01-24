import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { Colors } from '~/assets/Colors';
import { ComponentProps } from 'react';

import { ChartExtraLegend } from './ChartExtraLegend';

const { getByTestId, getByText, queryByText } = screen;

describe('<ChartExtraLegend />', () => {
  it('should have data-testid', () => {
    getRenderer();
    expect(getByTestId('ChartExtraLegend')).toBeInTheDocument();
  });

  it.each([Colors.chartPrimary, Colors.chartBlue])('should match snapshot using color %p', (color) => {
    const { container } = getRenderer({ color });
    expect(container).toMatchSnapshot();
  });

  it('should not display value when loading', () => {
    getRenderer({ isLoading: true, value: 222 });
    expect(queryByText('222')).not.toBeInTheDocument();
  });

  it('should display a skeleton when loading', () => {
    const { container } = getRenderer({ isLoading: true });
    expect(container).toMatchSnapshot();
  });

  it.each(['The label', 'Another label'])('should render the label', (label) => {
    getRenderer({ name: label });
    expect(getByText(label)).toBeInTheDocument();
  });

  it.each([100, 200])('should render the value', (value) => {
    getRenderer({ value });
    expect(getByText(value.toString())).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof ChartExtraLegend>;
function getRenderer({
  chartId = 'chart-id',
  color = '#fff',
  name = 'A label',
  seriesId = 'series',
  value = 123,
  ...rest
}: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <ChartExtraLegend chartId={chartId} color={color} name={name} seriesId={seriesId} value={value} {...rest} />
    </MantineProvider>,
  );
}
