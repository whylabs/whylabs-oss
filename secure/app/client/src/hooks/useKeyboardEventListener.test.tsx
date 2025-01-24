import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { useKeyboardEventListener } from './useKeyboardEventListener';

const { getByTestId } = screen;

describe('useKeyboardEventListener()', () => {
  it.each([
    ['Escape', '{Escape}'],
    ['Enter', '{enter}'],
    ['Tab', '{Tab}'],
  ])('should call the correct callback when the key %p is pressed', async (expected, keyToPress) => {
    getRenderer();
    expect(getByTestId('keyPressed')).toHaveTextContent('');

    await userEvent.keyboard(keyToPress);
    expect(getByTestId('keyPressed')).toHaveTextContent(expected);
  });
});

// Helpers
function getRenderer() {
  return render(<TestComponent />);
}

const TestComponent = (): JSX.Element => {
  const [keyPressed, setKeyPressed] = useState('');

  useKeyboardEventListener({
    keydown: {
      Escape: () => {
        setKeyPressed('Escape');
      },
      Enter: () => {
        setKeyPressed('Enter');
      },
      Tab: () => {
        setKeyPressed('Tab');
      },
    },
  });

  return <p data-testid="keyPressed">{keyPressed}</p>;
};
