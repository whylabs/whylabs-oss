import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { ActionsBottomBar } from './ActionsBottomBar';

const { getByRole, getByTestId } = screen;

describe('<ActionsBottomBar />', () => {
  it('should render cancel button', () => {
    getRenderer();
    expect(getByRole('button', { name: /cancel$/i })).toBeInTheDocument();
  });

  it('should render save button', () => {
    getRenderer();
    expect(getByRole('button', { name: /save$/i })).toBeInTheDocument();
  });

  it.each(['a-class', 'another-class'])('should include className %p', (expected) => {
    getRenderer({ className: expected });
    expect(getByTestId('ActionsBottomBar')).toHaveClass(expected);
  });

  it.each(['Discard', 'Go back'])(`should render %p as cancel button label`, (expected) => {
    getRenderer({ cancelButtonProps: { label: expected } });
    expect(getByRole('button', { name: expected })).toBeInTheDocument();
  });

  it.each(['Continue', 'Submit'])(`should render %p as submit button label`, (expected) => {
    getRenderer({ submitButtonProps: { label: expected } });
    expect(getByRole('button', { name: expected })).toBeInTheDocument();
  });

  it('should render disabled cancel button', () => {
    getRenderer({ cancelButtonProps: { disabled: true } });
    expect(getByRole('button', { name: /cancel$/i })).toBeDisabled();
  });

  it('should render disabled save button', () => {
    getRenderer({ submitButtonProps: { disabled: true } });
    expect(getByRole('button', { name: /save$/i })).toBeDisabled();
  });

  it('should call callback when cancel button is clicked', () => {
    const onCancel = jest.fn();
    getRenderer({ cancelButtonProps: { onClick: onCancel } });
    expect(onCancel).not.toHaveBeenCalled();

    getByRole('button', { name: /cancel$/i }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call callback when save button is clicked', () => {
    const onSave = jest.fn();
    getRenderer({ submitButtonProps: { onClick: onSave } });
    expect(onSave).not.toHaveBeenCalled();

    getByRole('button', { name: /save$/i }).click();
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

// Helpers
type Props = ComponentProps<typeof ActionsBottomBar>;
function getRenderer({ cancelButtonProps = {}, submitButtonProps = {}, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <ActionsBottomBar cancelButtonProps={cancelButtonProps} submitButtonProps={submitButtonProps} {...rest} />
    </MantineProvider>,
  );
}
