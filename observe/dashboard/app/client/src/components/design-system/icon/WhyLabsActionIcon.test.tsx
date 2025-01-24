import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import WhyLabsActionIcon from './WhyLabsActionIcon';

const { getByRole, getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsActionIcon';

describe('<WhyLabsActionIcon />', () => {
  it("should have default testid 'WhyLabsActionIcon'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A text', 'Another text'])('should render %p as a children', (expected) => {
    getRenderer({ children: <p>{expected}</p> });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should render a button with label %p', (expected) => {
    getRenderer({ label: expected });
    expect(getByRole('button', { name: expected })).toBeInTheDocument();
  });

  it('should call onClick callback when clicked', async () => {
    const onClick = jest.fn();
    getRenderer({ onClick });
    expect(onClick).not.toHaveBeenCalled();

    await userEvent.click(getByRole('button'));
    await userEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsActionIcon>;
function getRenderer({ children = 'I', label = 'The label', onClick = jest.fn(), ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsActionIcon label={label} onClick={onClick} {...rest}>
        {children}
      </WhyLabsActionIcon>
    </MantineProvider>,
  );
}
