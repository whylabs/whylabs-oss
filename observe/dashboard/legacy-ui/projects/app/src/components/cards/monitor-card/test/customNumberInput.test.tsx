import CustomNumberInput from 'components/form-fields/CustomNumberInput';
import { render } from '@testing-library/react';

const CUSTOM_INPUT_NUMBER_WRAPPER = 'custom-input-number-wrapper';
const INPUT_LABEL = 'label';

const defaultCustomNumberInputProps = {
  id: 'example',
  value: null,
  onChange: jest.fn(),
  label: 'example',
};

describe('Custom Number Input', () => {
  test('Components should be rendered correctly.', () => {
    const { getByTestId } = render(
      <CustomNumberInput
        id={defaultCustomNumberInputProps.id}
        value={defaultCustomNumberInputProps.value}
        onChange={defaultCustomNumberInputProps.onChange}
        label={defaultCustomNumberInputProps.label}
      />,
    );
    const divWrapper = getByTestId(CUSTOM_INPUT_NUMBER_WRAPPER);
    expect(divWrapper).toBeInTheDocument();
  });

  test('Label from the props should be rendered correctly', () => {
    const { getByTestId } = render(
      <CustomNumberInput
        id={defaultCustomNumberInputProps.id}
        value={defaultCustomNumberInputProps.value}
        onChange={defaultCustomNumberInputProps.onChange}
        label={defaultCustomNumberInputProps.label}
      />,
    );
    expect(getByTestId(INPUT_LABEL).textContent).toBe(defaultCustomNumberInputProps.label);
  });
});
