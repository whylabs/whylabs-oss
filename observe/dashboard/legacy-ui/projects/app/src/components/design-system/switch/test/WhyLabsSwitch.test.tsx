import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import WhyLabsSwitch, { WhyLabsSwitchProps } from '../WhyLabsSwitch';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsSwitch';

describe('<WhyLabsSwitch />', () => {
  it("should have default testid 'WhyLabsSwitch'", () => {
    getRenderer({ label: 'test' });
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['Sample label', 'Another label'])('should render with correct label: %p', (expected) => {
    getRenderer({ label: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsSwitchProps) {
  return render(
    <MantineProvider>
      <WhyLabsSwitch {...rest} />
    </MantineProvider>,
  );
}
