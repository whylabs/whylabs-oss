import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import WhyLabsSelectWithButtons from './WhyLabsSelectWithButtons';

const { getByRole, getByTestId } = screen;

const DEFAULT_LABEL = 'Select input';

describe('<WhyLabsSelectWithButtons />', () => {
  it('should render WhyLabsSelect', () => {
    getRenderer();
    expect(getByTestId('WhyLabsSelect')).toBeInTheDocument();
  });

  it('should render next button', () => {
    getRenderer();
    expect(getByRole('button', { name: `Select next ${DEFAULT_LABEL} option` })).toBeInTheDocument();
  });

  it('should render previous button', () => {
    getRenderer();
    expect(getByRole('button', { name: `Select previous ${DEFAULT_LABEL} option` })).toBeInTheDocument();
  });

  it('should disable buttons when there is no options', () => {
    getRenderer({ data: [] });
    expect(getByRole('button', { name: `Select next ${DEFAULT_LABEL} option` })).toBeDisabled();
    expect(getByRole('button', { name: `Select previous ${DEFAULT_LABEL} option` })).toBeDisabled();
  });

  describe('onChange callback', () => {
    it('should call it when the user clicks in the next button', async () => {
      const onChange = jest.fn();
      const data = defaultList();

      getRenderer({ data, onChange, value: data[1].value });
      expect(onChange).not.toHaveBeenCalled();

      await userEvent.click(getByRole('button', { name: `Select next ${DEFAULT_LABEL} option` }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(data[2].value);
    });

    it('should call it when the user clicks in the previous button', async () => {
      const onChange = jest.fn();
      const data = defaultList();

      getRenderer({ data, onChange, value: data[2].value });
      expect(onChange).not.toHaveBeenCalled();

      await userEvent.click(getByRole('button', { name: `Select previous ${DEFAULT_LABEL} option` }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(data[1].value);
    });

    it('should call it to select first item when the last one is selected on render', async () => {
      const onChange = jest.fn();
      const data = defaultList();

      getRenderer({ data, onChange, value: data[data.length - 1].value });

      await userEvent.click(getByRole('button', { name: `Select next ${DEFAULT_LABEL} option` }));
      expect(onChange).toHaveBeenCalledWith(data[0].value);
    });

    it('should call it to select last item when the first one is selected on render', async () => {
      const onChange = jest.fn();
      const data = defaultList();

      getRenderer({ data, onChange, value: data[0].value });

      await userEvent.click(getByRole('button', { name: `Select previous ${DEFAULT_LABEL} option` }));
      expect(onChange).toHaveBeenCalledWith(data[data.length - 1].value);
    });
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsSelectWithButtons>;
function getRenderer({ data = [], value, label = DEFAULT_LABEL, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsSelectWithButtons data={data} value={value ?? null} label={label} {...rest} />
    </MantineProvider>,
  );
}

function defaultList() {
  return [
    { label: 'A label', value: 'a-value' },
    { label: 'B label', value: 'b-value' },
    { label: 'C label', value: 'c-value' },
  ];
}
