import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WhyLabsNumberInput, { WhyLabsInputNumberProps } from './WhyLabsNumberInput';

const { getByLabelText, getByPlaceholderText, getByTestId, getByText, queryByText } = screen;

const TEST_ID = 'WhyLabsNumberInput';
const DEFAULT_LABEL = 'Insert a number';

describe('<WhyLabsNumberInput />', () => {
  it("should have default testid 'Select'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should have label %p', (label) => {
    getRenderer({ label });
    expect(getByLabelText(label)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should have default placeholder based on label %p', (label) => {
    getRenderer({ label });
    expect(getByPlaceholderText(`Insert ${label.toLowerCase()}`)).toBeInTheDocument();
  });

  it.each(['some-id', 'another-id'])('should have id %p', (id) => {
    getRenderer({ id });
    expect(getByLabelText(DEFAULT_LABEL)).toHaveAttribute('id', id);
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

  it.each(['A placeholder', 'Another placeholder'])('should have placeholder %p', (placeholder) => {
    getRenderer({ placeholder });
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it('should allow user to type in the searchbox', async () => {
    getRenderer();

    const inputElement = getByTestId(TEST_ID);
    await userEvent.type(inputElement, '1');
    expect(inputElement).toHaveValue('1');
  });

  it("should have 'Loading...' as placeholder", () => {
    getRenderer({ loading: true });
    expect(getByPlaceholderText('Loading...')).toBeInTheDocument();
  });

  describe('onChange callback', () => {
    it('should call it when the user insert a value', async () => {
      const onChange = jest.fn();

      getRenderer({ onChange });
      expect(onChange).not.toHaveBeenCalled();
      const inputElement = getByTestId(TEST_ID);

      await userEvent.type(inputElement, '1');
      expect(onChange).toHaveBeenCalledTimes(1);
      await userEvent.type(inputElement, '3');
      expect(onChange).toHaveBeenCalledTimes(2);

      expect(onChange).toHaveBeenNthCalledWith(1, 1);
      expect(onChange).toHaveBeenNthCalledWith(2, 13);
    });
  });
});

// Helpers
function getRenderer({ label = DEFAULT_LABEL, ...rest }: Partial<WhyLabsInputNumberProps> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsNumberInput label={label} {...rest} />
    </MantineProvider>,
  );
}
