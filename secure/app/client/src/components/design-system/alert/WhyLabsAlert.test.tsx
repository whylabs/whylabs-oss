import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import WhyLabsAlert from './WhyLabsAlert';

const { getByRole, getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsAlert';

describe('<WhyLabsAlert />', () => {
  it("should have default testid 'WhyLabsAlert'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should have alert role', () => {
    getRenderer();
    expect(getByRole('alert')).toBeInTheDocument();
  });

  it.each(['A title', 'Another title'])('should have title %p', (expected) => {
    getRenderer({ title: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['A text', 'Another text'])('should render %p as a children', (expected) => {
    getRenderer({ children: <p>{expected}</p> });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['a-class', 'another-class'])(`should render %p as a className`, (expected) => {
    getRenderer({ className: expected });
    expect(getByTestId(TEST_ID)).toHaveClass(`mantine-Alert-root ${expected}`);
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsAlert>;
function getRenderer({ children = <p>Alert text</p>, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsAlert {...rest}>{children}</WhyLabsAlert>
    </MantineProvider>,
  );
}
