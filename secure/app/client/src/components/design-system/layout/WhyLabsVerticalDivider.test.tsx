import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { WhyLabsVerticalDivider } from './WhyLabsVerticalDivider';

const { getByTestId } = screen;

describe('<WhyLabsVerticalDivider />', () => {
  it.each(['80%', 40])('should match snapshot with custom height %p', (expected) => {
    const { container } = getRenderer({ height: expected });
    expect(container).toMatchSnapshot();
  });

  it.each(['a-class', 'another-class'])(`should have class "%p"`, (className) => {
    getRenderer({ className });
    expect(getByTestId('WhyLabsVerticalDivider')).toHaveClass(className);
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsVerticalDivider>;
function getRenderer(props: Partial<Props> = {}) {
  return render(<WhyLabsVerticalDivider {...props} />);
}
