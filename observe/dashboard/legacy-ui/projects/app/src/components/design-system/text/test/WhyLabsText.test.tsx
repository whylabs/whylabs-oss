import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import WhyLabsText, { WhyLabsTextProps } from '../WhyLabsText';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsText';

describe('<WhyLabsText />', () => {
  it("should have default testid 'WhyLabsText'", () => {
    getRenderer({});
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['My test text', 'WhyLabs Text'])('should render with correct text: %p', (expected) => {
    getRenderer({ children: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsTextProps) {
  return render(
    <MantineProvider>
      <WhyLabsText {...rest} />
    </MantineProvider>,
  );
}
