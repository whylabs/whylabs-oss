import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { ChartCardExtraLegends } from './ChartCardExtraLegends';

const { getByTestId, getByText } = screen;

describe('<ChartCardExtraLegends />', () => {
  it('should have data-testid', () => {
    getRenderer();
    expect(getByTestId('ChartCardExtraLegends')).toBeInTheDocument();
  });

  it('should render legends', () => {
    const legends = [
      { color: 'red', name: 'Red', seriesId: 'red', value: 1 },
      { color: 'green', name: 'Green', seriesId: 'green', value: 2 },
    ];
    getRenderer({ legends });

    legends.forEach(({ name, value }) => {
      expect(getByText(name)).toBeInTheDocument();
      expect(getByText(value)).toBeInTheDocument();
    });
  });
});

// Helpers
type Props = ComponentProps<typeof ChartCardExtraLegends>;
function getRenderer({ chartId = 'chart-id', legends = [], ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <ChartCardExtraLegends chartId={chartId} legends={legends} {...rest} />
    </MantineProvider>,
  );
}
