import NumericControl from 'components/cards/monitor-card/NumericControl';
import { render, fireEvent } from '@testing-library/react';

const NUMERIC_CONTROL = 'numeric-control';
const NUMERIC_CONTROL_INPUT = 'text-field-input';
const defaultNumericControlProps = {
  id: 'example',
  label: 'example',
  value: null,
  handleChange: jest.fn(),
  setButtonDisabled: jest.fn(),
  min: 1,
  max: 2,
  decimals: 2,
  setManualPreview: jest.fn(),
};

describe('NumericControl', () => {
  test('Components should be rendered correctly.', () => {
    const { getByTestId } = render(
      <NumericControl
        id={defaultNumericControlProps.id}
        label={defaultNumericControlProps.label}
        value={defaultNumericControlProps.value}
        handleChange={defaultNumericControlProps.handleChange}
      />,
    );
    expect(getByTestId(NUMERIC_CONTROL)).toBeInTheDocument();
  });

  test('The value should be updated correctly on input change.', () => {
    const { getByTestId } = render(
      <NumericControl
        id={defaultNumericControlProps.id}
        label={defaultNumericControlProps.label}
        value={defaultNumericControlProps.value}
        handleChange={defaultNumericControlProps.handleChange}
      />,
    );
    const textFieldInput = getByTestId(NUMERIC_CONTROL_INPUT) as HTMLInputElement;

    expect(textFieldInput.value).toBe('Auto');
    fireEvent.change(textFieldInput, { target: { value: '1' } });
    expect(textFieldInput.value).toBe('1');
  });
});
