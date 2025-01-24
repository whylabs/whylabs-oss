import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import WhyLabsAnchor, { WhyLabsAnchorProps } from './WhyLabsAnchor';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsAnchor';

describe('<WhyLabsAnchor />', () => {
  it("should have default testid 'WhyLabsAnchor'", () => {
    getRenderer({});
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['My test link', 'WhyLabs link'])('should render with correct content: %p', (expected) => {
    getRenderer({ children: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsAnchorProps) {
  return render(
    <MantineProvider>
      <WhyLabsAnchor {...rest} />
    </MantineProvider>,
  );
}
