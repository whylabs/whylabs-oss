import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { ChartCard } from './ChartCard';

const { getByTestId, getByText } = screen;

describe('<ChartCard />', () => {
  it('should have data-testid', () => {
    getRenderer();
    expect(getByTestId('ChartCard')).toBeInTheDocument();
  });

  it.each(['A children', 'another children'])('should render the children %p', (children) => {
    getRenderer({ children });
    expect(getByText(children)).toBeInTheDocument();
  });

  it.each(['A title', 'Another title'])('should render title %p', () => {
    getRenderer({ title: 'A title' });
    expect(getByText('A title')).toBeInTheDocument();
  });

  it('should render titleRightChildren', () => {
    const titleRightChildren = <p>Right children</p>;
    getRenderer({ titleRightChildren });
    expect(getByText('Right children')).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof ChartCard>;
function getRenderer({ children = <p>Children</p>, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <ChartCard {...rest}>{children}</ChartCard>
    </MantineProvider>,
  );
}
