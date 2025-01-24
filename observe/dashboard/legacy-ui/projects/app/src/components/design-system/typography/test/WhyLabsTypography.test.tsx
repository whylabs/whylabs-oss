import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import WhyLabsTypography, { WhyLabsTypographyProps } from '../WhyLabsTypography';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsTypography';

describe('<WhyLabsTypography />', () => {
  it("should have default testid 'WhyLabsTypography'", () => {
    getRenderer({});
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['My test text', 'WhyLabs Typography'])('should render with correct text: %p', (expected) => {
    getRenderer({ children: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsTypographyProps) {
  return render(
    <MantineProvider>
      <WhyLabsTypography {...rest} />
    </MantineProvider>,
  );
}
