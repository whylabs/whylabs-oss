import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import SidebarMenuButton from './SidebarMenuButton';

const { getByRole, getByLabelText } = screen;

const BUTTON_LABEL = 'Open sidebar menu';

describe('<SidebarMenuButton />', () => {
  it('should have label', () => {
    getRenderer();
    expect(getByLabelText(BUTTON_LABEL)).toBeInTheDocument();
  });

  it('should have role', () => {
    getRenderer();
    expect(getByRole('button', { name: BUTTON_LABEL })).toBeInTheDocument();
  });

  it('should match snapshot for the child icon', () => {
    getRenderer();
    expect(getByRole('button').firstChild?.childNodes).toMatchSnapshot();
  });

  it.todo('should set sidebar open to true when clicked');

  // Hard to test since it's a dynamic style from Mantine, need a way to make it static for testing
  it.todo('should set dark style when isDark is true');
});

// Helpers
type Props = ComponentProps<typeof SidebarMenuButton>;
function getRenderer(props: Partial<Props> = {}) {
  return render(<SidebarMenuButton {...props} />);
}
