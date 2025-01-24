import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { ClickableDiv } from './ClickableDiv';

const { getByRole } = screen;

describe('<ClickableDiv />', () => {
  it('should render as button', () => {
    getRenderer();
    expect(getByRole('button')).toBeInTheDocument();
  });

  it.each(['Children', 'Another children'])('should render children %p', (expected) => {
    getRenderer({ children: expected });
    expect(getByRole('button', { name: expected })).toBeInTheDocument();
  });

  it.each(['a label', 'another label'])('should have aria-label %p', (expected) => {
    getRenderer({ 'aria-label': expected });
    expect(getByRole('button')).toHaveAttribute('aria-label', expected);
  });

  it.each(['id-1', 'id-2'])('should have id %p', (expected) => {
    getRenderer({ id: expected });
    expect(getByRole('button')).toHaveAttribute('id', expected);
  });

  it.each(['a-class', 'another-class'])('should have class %p', (expected) => {
    getRenderer({ className: expected });
    expect(getByRole('button')).toHaveClass(expected);
  });

  it('should call onClick callback', async () => {
    const onClick = jest.fn();
    getRenderer({ onClick });
    expect(onClick).not.toHaveBeenCalled();

    await userEvent.click(getByRole('button'));
    await userEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

// Helpers
type TestProps = ComponentProps<typeof ClickableDiv>;

function getRenderer({ children = 'The children', onClick = jest.fn(), ...rest }: Partial<TestProps> = {}) {
  return render(
    <ClickableDiv onClick={onClick} {...rest}>
      {children}
    </ClickableDiv>,
  );
}
