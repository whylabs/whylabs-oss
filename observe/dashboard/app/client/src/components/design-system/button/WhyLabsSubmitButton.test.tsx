import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import WhyLabsSubmitButton from './WhyLabsSubmitButton';

const { getByRole, getByTestId } = screen;

const TEST_ID = 'WhyLabsSubmitButton';

describe('<WhyLabsSubmitButton />', () => {
  it("should have default testid 'WhyLabsSubmitButton'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it("should have type='submit' by default", () => {
    getRenderer();
    expect(getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it.each(['button', 'reset'])('should have type="%s" when passed', (type) => {
    // @ts-expect-error - ignoring type error for testing purposes
    getRenderer({ type });
    expect(getByRole('button')).toHaveAttribute('type', type);
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsSubmitButton>;
function getRenderer({ children = <p>Alert text</p>, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsSubmitButton {...rest}>{children}</WhyLabsSubmitButton>
    </MantineProvider>,
  );
}
