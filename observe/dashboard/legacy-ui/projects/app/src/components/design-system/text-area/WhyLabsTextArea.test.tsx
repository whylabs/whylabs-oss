import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhyLabsTextArea, { WhyLabsTextareaProps } from './WhyLabsTextArea';

const { getByLabelText, getByPlaceholderText, getByRole, getByTestId, getByText, queryByText } = screen;

const TEST_ID = 'WhyLabsTextarea';
const DEFAULT_LABEL = 'Type a piece of text';

describe('<WhyLabsTextarea />', () => {
  it("should have default testid 'Select'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should have label %p', (label) => {
    getRenderer({ label });
    expect(getByLabelText(label)).toBeInTheDocument();
  });

  it.each(['A placeholder', 'Another placeholder'])('should have placeholder %p', (placeholder) => {
    getRenderer({ placeholder });
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it.each(['some-id', 'another-id'])('should have id %p', (id) => {
    getRenderer({ id });
    expect(getByLabelText(DEFAULT_LABEL)).toHaveAttribute('id', id);
  });

  it('should allow user to type in the textbox', () => {
    getRenderer();

    const inputElement = getByRole('textbox');
    userEvent.type(inputElement, '1');
    expect(inputElement).toHaveValue('1');
  });

  it("should display the label when 'hideLabel' is false", () => {
    getRenderer({ hideLabel: false });
    expect(getByText(DEFAULT_LABEL)).toBeInTheDocument();
    expect(getByLabelText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it("should hide the label when 'hideLabel' is true", () => {
    getRenderer({ hideLabel: true });
    expect(queryByText(DEFAULT_LABEL)).not.toBeInTheDocument();
    expect(getByLabelText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it('should be valid', () => {
    getRenderer({ error: undefined });
    expect(getByRole('textbox')).toBeValid();
  });

  it.each(['Please select something', 'Another error'])('should be invalid with error message %p', (expected) => {
    getRenderer({ error: expected });
    expect(getByRole('textbox')).toBeInvalid();
    expect(getByText(expected)).toBeInTheDocument();
  });

  it('should be invalid with a boolean error', () => {
    getRenderer({ error: true });
    expect(getByRole('textbox')).toBeInvalid();
  });

  describe('onChange callback', () => {
    it('should call it when the user insert a value', () => {
      const onChange = jest.fn();
      getRenderer({ onChange });
      expect(onChange).not.toHaveBeenCalled();

      const inputElement = getByRole('textbox');
      userEvent.type(inputElement, 'ab');
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('should call it with typed values', () => {
      const onChange = jest.fn();
      getRenderer({ onChange });

      const inputElement = getByRole('textbox');
      userEvent.type(inputElement, 'ab');
      userEvent.paste(inputElement, 'cde');
      expect(onChange).toHaveBeenNthCalledWith(1, 'a');
      expect(onChange).toHaveBeenNthCalledWith(2, 'ab');
      expect(onChange).toHaveBeenNthCalledWith(3, 'abcde');

      userEvent.clear(inputElement);
      expect(onChange).toHaveBeenLastCalledWith('');
    });
  });
});

// Helpers
function getRenderer({ label = DEFAULT_LABEL, ...rest }: Partial<WhyLabsTextareaProps> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsTextArea label={label} {...rest} />
    </MantineProvider>,
  );
}
