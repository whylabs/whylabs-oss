import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { SectionTitle } from './SectionTitle';

const { getByRole } = screen;

describe('<SectionTitle />', () => {
  it.each(['A nice title', 'Another title'])('should display the title %p', (expected) => {
    getRenderer({ title: expected });
    expect(getByRole('heading', { name: expected })).toBeInTheDocument();
  });

  it.each(['a-class', 'another-class'])(`should render %p as a className`, (expected) => {
    getRenderer({ className: expected, title: 'Something' });
    expect(getByRole('heading')).toHaveClass(expected);
  });
});

// Helpers
type Props = ComponentProps<typeof SectionTitle>;
function getRenderer(props: Props) {
  return render(
    <MantineProvider>
      <SectionTitle {...props} />
    </MantineProvider>,
  );
}
