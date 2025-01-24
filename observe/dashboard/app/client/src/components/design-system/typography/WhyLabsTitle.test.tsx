import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import WhyLabsTitle, { WhyLabsTitleProps } from './WhyLabsTitle';

const { getByTestId, getByRole } = screen;

const TEST_ID = 'WhyLabsTitle';

describe('<WhyLabsTitle />', () => {
  it("should have default testid 'WhyLabsTitle'", () => {
    getRenderer({});
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['My test title', 'WhyLabs Typography'])('should render heading with correct text: %p', (expected) => {
    getRenderer({ children: expected });
    expect(getByRole('heading', { name: expected })).toBeInTheDocument();
  });

  it('should render as h1 by default', () => {
    getRenderer();
    expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it.each([
    ['h1', 1],
    ['h2', 2],
    ['h3', 3],
    ['h4', 4],
  ])('should render with correct variant: %p', (element, level) => {
    getRenderer({ element: element as WhyLabsTitleProps['element'] });
    expect(getByRole('heading', { level })).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsTitleProps = {}) {
  return render(
    <MantineProvider>
      <WhyLabsTitle {...rest} />
    </MantineProvider>,
  );
}
