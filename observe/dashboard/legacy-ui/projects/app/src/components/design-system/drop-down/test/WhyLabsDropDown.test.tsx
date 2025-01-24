import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import WhyLabsDropDown from '../WhyLabsDropDown';
import WhyLabsButton from '../../button/WhyLabsButton';

const { getByTestId, queryByText } = screen;

const TEST_ID = 'WhyLabsDropDown';
const BADGE_TEXT = 'Badge text';
const TARGET = <WhyLabsButton variant="filled">Open</WhyLabsButton>;

describe('<WhyLabsDropDown />', () => {
  it("should have default testid 'WhyLabsDropDown'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A text', 'Another text'])('should render %p as a children when opened', (expected) => {
    getRenderer({ children: <p>{expected}</p>, opened: true });
    expect(queryByText(expected)).toBeInTheDocument();
  });

  it.each(['A text', 'Another text'])('should not render %p as a children when closed', (expected) => {
    getRenderer({ children: <p>{expected}</p> });
    expect(queryByText(expected)).not.toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsDropDown>;
function getRenderer({ children = <p>{BADGE_TEXT}</p>, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsDropDown target={TARGET} {...rest}>
        {children}
      </WhyLabsDropDown>
    </MantineProvider>,
  );
}
