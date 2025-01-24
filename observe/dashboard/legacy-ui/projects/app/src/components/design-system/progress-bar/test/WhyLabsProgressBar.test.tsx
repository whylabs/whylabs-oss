import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import WhyLabsProgressBar, { WhyLabsProgressBarProps } from '../WhyLabsProgressBar';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsProgressBar';

describe('<WhyLabsProgressBar />', () => {
  it("should have default testid 'WhyLabsProgressBar'", () => {
    getRenderer({});
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should render with correct bottom text', () => {
    getRenderer({ bottomText: <p>progress: 50%</p>, value: 50 });
    expect(getByText('progress: 50%')).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsProgressBarProps) {
  return render(
    <MantineProvider>
      <WhyLabsProgressBar {...rest} />
    </MantineProvider>,
  );
}
