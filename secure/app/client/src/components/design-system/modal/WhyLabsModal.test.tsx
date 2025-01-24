import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';

import WhyLabsModal, { WhyLabsModalProps } from './WhyLabsModal';

const { getByTestId, getByText } = screen;

const props = {
  title: 'Super cool title',
  onClose: jest.fn(() => true),
  opened: true,
};
const TEST_ID = 'WhyLabsModal';

describe('<WhyLabsModal />', () => {
  it("should have default testid 'WhyLabsModal' and be opened", () => {
    getRenderer(props);
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should have correct title', () => {
    getRenderer(props);
    expect(getByText(props.title)).toBeInTheDocument();
  });

  it('should call onClose function', () => {
    getRenderer(props);
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);
    expect(props.onClose.mock.calls).toHaveLength(1);
  });
});

// Helpers
function getRenderer({ ...rest }: WhyLabsModalProps) {
  return render(
    <MantineProvider>
      <WhyLabsModal {...rest} />
    </MantineProvider>,
  );
}
