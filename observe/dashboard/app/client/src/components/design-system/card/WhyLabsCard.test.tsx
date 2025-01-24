import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { WhyLabsCard } from './WhyLabsCard';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsCard';

describe('<WhyLabsCard />', () => {
  it("should have default testid 'WhyLabsCard'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['a-class', 'another-class'])(`should render %p as a className`, (expected) => {
    getRenderer({ className: expected });
    expect(getByTestId(TEST_ID)).toHaveClass(`${expected}`);
  });

  it.each(['Label', 'Another label'])("should render children '%s'", (expected) => {
    getRenderer({ children: <p>{expected}</p> });
    expect(getByText(expected)).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsCard>;
function getRenderer({ children = <p>Children</p>, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsCard {...rest}>{children}</WhyLabsCard>
    </MantineProvider>,
  );
}
