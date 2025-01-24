import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { WhyLabsDrawer } from './WhyLabsDrawer';

const { getByTestId, getByText } = screen;
const CHILD_CONTENT = 'I am the child';
const DEFAULT_PROPS = {
  title: 'Super cool title',
  onClose: jest.fn(() => true),
  isOpen: true,
  children: <>{CHILD_CONTENT}</>,
};
const TEST_ID = 'WhyLabsDrawer';

describe('<WhyLabsDrawer />', () => {
  it("should have default testid 'WhyLabsDrawer' and be opened", () => {
    getRenderer(DEFAULT_PROPS);
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should have correct title', () => {
    getRenderer(DEFAULT_PROPS);
    expect(getByText(DEFAULT_PROPS.title)).toBeInTheDocument();
  });

  it('should render children', () => {
    getRenderer(DEFAULT_PROPS);
    expect(getByText(CHILD_CONTENT)).toBeInTheDocument();
  });

  it('should call onClose function', () => {
    getRenderer(DEFAULT_PROPS);
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);
    expect(DEFAULT_PROPS.onClose.mock.calls).toHaveLength(1);
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsDrawer>;
function getRenderer(props: Props) {
  return render(
    <MantineProvider>
      <WhyLabsDrawer {...props} />
    </MantineProvider>,
  );
}
