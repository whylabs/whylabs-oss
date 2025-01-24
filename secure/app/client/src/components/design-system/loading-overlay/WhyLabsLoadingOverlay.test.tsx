import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import WhyLabsLoadingOverlay, { WhyLabsLoadingOverlayProps } from './WhyLabsLoadingOverlay';

const { getByTestId } = screen;

const TEST_ID = 'WhyLabsLoadingOverlay';

describe('<WhyLabsLoadingOverlay />', () => {
  it("should have default testid 'WhyLabsLoadingOverlay'", () => {
    getRenderer({ visible: true });
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it("should have not testid 'WhyLabsLoadingOverlay'", () => {
    getRenderer({ visible: false });
    let element;
    try {
      element = getByTestId(TEST_ID);
    } catch (e) {
      // load not visible
    }
    expect(element).toBeFalsy();
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsLoadingOverlayProps) {
  return render(
    <MantineProvider>
      <WhyLabsLoadingOverlay {...rest} />
    </MantineProvider>,
  );
}
