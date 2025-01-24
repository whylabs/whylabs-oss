import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ComponentProps, act } from 'react';

import { AccessTokenForm } from './AccessTokenForm';

const { getByRole } = screen;

const SUBMIT_BUTTON_LABEL = /create access token/i;

describe('<AccessTokenForm />', () => {
  it('should render token name input', () => {
    getRenderer();
    expect(getByRole('textbox', { name: /name/i })).toBeInTheDocument();
  });

  it('should render expires date picker', () => {
    getRenderer();
    expect(getByRole('button', { name: /expires/i })).toBeInTheDocument();
  });

  it('should render submit button', () => {
    getRenderer();
    expect(getByRole('button', { name: SUBMIT_BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should disable submit button when token name is empty', () => {
    getRenderer();
    expect(getByRole('button', { name: SUBMIT_BUTTON_LABEL })).toBeDisabled();
  });

  it('should enable submit button when token name is not empty', async () => {
    getRenderer();
    await userEvent.type(getByRole('textbox', { name: /name/i }), 't');
    expect(getByRole('button', { name: SUBMIT_BUTTON_LABEL })).toBeEnabled();
  });

  describe('onSubmit callback', () => {
    it.each(['Token name', 'Another name'])(
      'should call it with token name %p when form is submitted',
      async (expected) => {
        const onSubmit = jest.fn();
        getRenderer({ onSubmit });
        expect(onSubmit).not.toHaveBeenCalled();

        act(() => getByRole('textbox', { name: /name/i }).focus());
        await userEvent.paste(expected);

        await userEvent.click(getByRole('button', { name: SUBMIT_BUTTON_LABEL }));
        expect(onSubmit).toHaveBeenCalledWith(expected, null);
      },
    );
  });
});

// Helpers
type Props = ComponentProps<typeof AccessTokenForm>;
function getRenderer({ isSaving = false, onSubmit = jest.fn(), ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <AccessTokenForm isSaving={isSaving} onSubmit={onSubmit} {...rest} />
    </MantineProvider>,
  );
}
