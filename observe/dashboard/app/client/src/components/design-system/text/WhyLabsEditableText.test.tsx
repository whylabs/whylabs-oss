import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import { WhyLabsEditableText } from './WhyLabsEditableText';

const { getAllByRole, getByRole, getByTestId, getByText, queryByRole } = screen;

const TEST_ID = 'WhyLabsEditableText';

describe('<WhyLabsEditableText />', () => {
  it("should have default testid 'WhyLabsEditableText'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['a-class', 'another-class'])('should have className %p', (className) => {
    getRenderer({ className });
    expect(getByTestId(TEST_ID)).toHaveClass(className);
  });

  describe('when in text mode', () => {
    it.each(['lorem ipsum', 'foo bar'])('should render the value as text by default %p', (value) => {
      getRenderer({ value });
      expect(getByText(value)).toBeInTheDocument();
    });

    it('should render two edit buttons', () => {
      getRenderer();
      expect(getAllByRole('button', { name: /^edit/i })).toHaveLength(2);
    });

    it('should not render save button', () => {
      getRenderer();
      expect(queryByRole('button', { name: /^save/i })).not.toBeInTheDocument();
    });

    it('should toggle to edit mode when clicking on the first edit button', async () => {
      getRenderer();
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[0]);
      expect(getByRole('textbox')).toBeInTheDocument();
    });

    it('should toggle to edit mode when clicking on the second edit button', async () => {
      getRenderer();
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[1]);
      expect(getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('when in edit mode', () => {
    it('should hide edit buttons', async () => {
      getRenderer();
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[0]);

      expect(queryByRole('button', { name: /^edit/i })).not.toBeInTheDocument();
    });

    it('should render save button', async () => {
      getRenderer();
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[1]);

      expect(getByRole('button', { name: /^save/i })).toBeInTheDocument();
    });

    it.each(['The label', 'Another label'])('should render a text input with label %p', async (label) => {
      getRenderer({ label });
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[0]);

      expect(getByRole('textbox', { name: label })).toBeInTheDocument();
    });

    it.each(['Abc', '1234'])('should render input text with default value %p', async (value) => {
      getRenderer({ value });
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[0]);
      expect(getByRole('textbox')).toHaveValue(value);
    });

    it('should call onChange callback', async () => {
      const onChange = jest.fn();
      getRenderer({ onChange });
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[0]);

      getByRole('textbox').focus();
      await userEvent.paste('new value');
      expect(onChange).toHaveBeenCalledWith('new value');
    });

    it('should change back to text mode after saving', async () => {
      getRenderer({ value: 'My title' });
      await userEvent.click(getAllByRole('button', { name: /^edit/i })[0]);

      await userEvent.click(getByRole('button', { name: /^save/i }));
      expect(queryByRole('button', { name: /^save/i })).not.toBeInTheDocument();
      expect(getByText('My title')).toBeInTheDocument();
    });
  });
});

// Helpers
function getRenderer({
  label = 'A label',
  onChange = jest.fn(),
  value = 'A value',
  ...rest
}: Partial<ComponentProps<typeof WhyLabsEditableText>> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsEditableText label={label} onChange={onChange} value={value} {...rest} />
    </MantineProvider>,
  );
}
