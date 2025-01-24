import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { WhyLabsDivider } from './WhyLabsDivider';

const { getByTestId } = screen;

describe('<WhyLabs />', () => {
  it.each(['small', 'medium', 'large'])('should match snapshot for size "%p"', (size) => {
    // @ts-expect-error - make TS happy with this test
    getRenderer({ size });
    expect(getByTestId('WhyLabs')).toMatchSnapshot();
  });

  it.each(['a-class', 'another-class'])(`should have class "%p"`, (className) => {
    getRenderer({ className });
    expect(getByTestId('WhyLabs')).toHaveClass(className);
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsDivider>;
function getRenderer(props: Partial<Props> = {}) {
  return render(<WhyLabsDivider {...props} />);
}
