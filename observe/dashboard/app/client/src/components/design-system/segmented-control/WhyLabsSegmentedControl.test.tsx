import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import WhyLabsSegmentedControl, { WhyLabsSegmentedControlProps } from './WhyLabsSegmentedControl';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsSegmentedControl';

const mockData = [
  { label: 'WhyLabs', value: 'whylabs' },
  { label: 'WhyLogs', value: 'whylogs' },
];

describe('<WhyLabsSegmentedControl />', () => {
  it("should have default testid 'WhyLabsSegmentedControl'", () => {
    getRenderer({ data: mockData });
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['WhyLabs', 'WhyLogs'])('should render with correct label: %p', (expected) => {
    getRenderer({ data: mockData });
    expect(getByText(expected)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsSegmentedControlProps) {
  return render(
    <MantineProvider>
      <WhyLabsSegmentedControl {...rest} />
    </MantineProvider>,
  );
}
