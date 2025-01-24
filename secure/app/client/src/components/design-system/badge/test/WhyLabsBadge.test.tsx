import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import WhyLabsBadge from '../WhyLabsBadge';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsBadge';
const BADGE_TEXT = 'Badge text';

describe('<WhyLabsBadge />', () => {
  it("should have default testid 'WhyLabsBadge'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A text', 'Another text'])('should render %p as a children', (expected) => {
    getRenderer({ children: <p>{expected}</p> });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['a-class', 'another-class'])(`should render %p as a className`, (expected) => {
    getRenderer({ className: expected });
    expect(getByTestId(TEST_ID)).toHaveClass(`mantine-Badge-root ${expected}`);
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsBadge>;
function getRenderer({ children = <p>{BADGE_TEXT}</p>, ...rest }: Partial<Props> = {}) {
  return render(<WhyLabsBadge {...rest}>{children}</WhyLabsBadge>);
}
