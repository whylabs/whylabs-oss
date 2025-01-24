import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MembershipRole } from '~server/graphql/generated/graphql';
import { ComponentProps } from 'react';

import { EditUserForm } from './EditUserForm';

const { getByRole } = screen;

const SUBMIT_BUTTON_LABEL = 'Save';

describe('<EditUserForm />', () => {
  it.each(['a-form-id', 'another-id'])('should render form with id %s', (formId) => {
    const { container } = getRenderer({ formId });
    expect(container.getElementsByTagName('form')[0]).toHaveAttribute('id', formId);
  });

  it('should render read-only email input', () => {
    getRenderer();
    expect(getByRole('textbox', { name: /email address/i })).toBeDisabled();
  });

  it.each(['test-email@test.com', 'another-email@test.com'])('should render email input with value %s', (email) => {
    getRenderer({ email });
    expect(getByRole('textbox', { name: /email address/i })).toHaveValue(email);
  });

  it('should render role selector', () => {
    getRenderer();
    expect(getByRole('searchbox', { name: /role/i })).toBeInTheDocument();
  });

  it('should render submit button', () => {
    getRenderer();
    expect(getByRole('button', { name: SUBMIT_BUTTON_LABEL })).toBeInTheDocument();
  });

  describe('onSubmit callback', () => {
    it('should call it with when form is submitted', async () => {
      const onSubmit = jest.fn((event) => {
        event.preventDefault();
      });
      getRenderer({ onSubmit });
      expect(onSubmit).not.toHaveBeenCalled();

      await userEvent.click(getByRole('button', { name: SUBMIT_BUTTON_LABEL }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});

// Helpers
type Props = ComponentProps<typeof EditUserForm>;
function getRenderer({
  email = 'something@test.com',
  formId = 'form-id',
  onChangeRole = jest.fn(),
  onSubmit = jest.fn(),
  value = MembershipRole.Viewer,
}: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <EditUserForm email={email} formId={formId} onChangeRole={onChangeRole} onSubmit={onSubmit} value={value} />
      <button form={formId} type="submit">
        {SUBMIT_BUTTON_LABEL}
      </button>
    </MantineProvider>,
  );
}
