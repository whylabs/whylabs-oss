import { useDeepCompareEffect } from './useDeepCompareEffect';

// Add new keys to this array to support them
const VALID_KEYS = ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Escape', 'Enter', 'Tab'] as const;

type KeyboardEventKeys = (typeof VALID_KEYS)[number];

type UseKeyboardEventListenerProps = {
  keydown: {
    [key in KeyboardEventKeys]?: (event: KeyboardEvent) => void;
  };
};

/**
 * Hook to handle keyboard events
 * @param keydown - Object with keys as the key to listen for and values as the callback
 * @example
 * useKeyboardEventListener({
 *  keydown: {
 *   Escape: () => {
 *    // Do something when escape is pressed
 *  },
 * Enter: () => {
 *   // Do something when enter is pressed
 * },
 */
export const useKeyboardEventListener = ({ keydown }: UseKeyboardEventListenerProps) => {
  useDeepCompareEffect(() => {
    const keydownHandler = (event: KeyboardEvent) => {
      const { key } = event;
      if (isValidKey(key)) {
        keydown[key]?.(event);
      }
    };

    document.addEventListener('keydown', keydownHandler);
    return () => {
      document.removeEventListener('keydown', keydownHandler);
    };
  }, [keydown]);
};

function isValidKey(key: string): key is KeyboardEventKeys {
  return VALID_KEYS.includes(key as KeyboardEventKeys);
}
