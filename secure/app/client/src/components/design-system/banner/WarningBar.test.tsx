import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { WarningBar } from './WarningBar';

const { getAllByRole, getByRole, getByTestId, getByText, queryByRole } = screen;

const TEST_ID = 'WarningBar';
const CLOSE_BUTTON = /^close alert$/i;

describe('<WarningBar />', () => {
  it("should have default testid 'WarningBar'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['one-id', 'another-id'])('should render an status with id=%p', (id) => {
    getRenderer({ id });
    expect(getByRole('status')).toHaveAttribute('id', id);
  });

  it.each(['A children', 'Another children'])('should render children %p', (children) => {
    getRenderer({ children });
    expect(getByText(children)).toBeInTheDocument();
  });

  it.each(['info', 'warn'])('should match snapshot for color %p', (color) => {
    // @ts-expect-error - it is a valid color for the component
    const container = getRenderer({ color });
    expect(container).toMatchSnapshot();
  });

  it.each(['A button', 'Another button'])('should render button', (label) => {
    const button = { label, onClick: jest.fn() };
    getRenderer({ button });
    expect(getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('should call button onClick callback when button is clicked', () => {
    const onClick = jest.fn();
    getRenderer({ button: { label: 'A button', onClick } });
    expect(onClick).not.toHaveBeenCalled();

    getByRole('button', { name: 'A button' }).click();
    getByRole('button', { name: 'A button' }).click();
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('should not render close button when onClose callback is undefined', () => {
    getRenderer({ onClose: undefined });
    expect(queryByRole('button', { name: CLOSE_BUTTON })).not.toBeInTheDocument();
  });

  it('should render close button when onClose callback is provided', () => {
    const onClose = jest.fn();
    getRenderer({ onClose });
    expect(getByRole('button', { name: CLOSE_BUTTON })).toBeInTheDocument();
  });

  it('should call onClose callback when close button is clicked', () => {
    const onClose = jest.fn();
    getRenderer({ onClose });
    expect(onClose).not.toHaveBeenCalled();

    getByRole('button', { name: CLOSE_BUTTON }).click();
    getByRole('button', { name: CLOSE_BUTTON }).click();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('should display both button and close button', () => {
    const button = { label: 'A button', onClick: jest.fn() };
    const onClose = jest.fn();

    getRenderer({ button, onClose });
    expect(getAllByRole('button')).toHaveLength(2);
  });
});

// Helpers
type Props = ComponentProps<typeof WarningBar>;
function getRenderer({ id = 'warning-bar', children = 'The children', ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WarningBar id={id} {...rest}>
        {children}
      </WarningBar>
    </MantineProvider>,
  );
}
