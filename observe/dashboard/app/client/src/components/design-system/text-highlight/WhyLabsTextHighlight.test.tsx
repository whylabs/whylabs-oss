import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import WhyLabsTextHighlight, { WhyLabsTextHighlightProps } from './WhyLabsTextHighlight';

const { getByTestId } = screen;

const TEST_ID = 'WhyLabsTextHighlight';

describe('<WhyLabsTextHighlight />', () => {
  it("should have default testid 'WhyLabsTextHighlight'", () => {
    getRenderer({ highlight: 'test', children: 'text for test' });
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsTextHighlightProps) {
  return render(
    <MantineProvider>
      <WhyLabsTextHighlight {...rest} />
    </MantineProvider>,
  );
}
