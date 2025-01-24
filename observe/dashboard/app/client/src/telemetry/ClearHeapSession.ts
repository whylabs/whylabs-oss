import LogRocket from 'logrocket';

/**
 * Clears Heap Analytics Session. Should be done any time the user logs out.
 * Does not throw.
 */
export const clearHeapSession = (): void => {
  try {
    const { clearEventProperties } = window.heap ?? {};
    clearEventProperties?.();
  } catch (error: unknown) {
    if (error instanceof Error) {
      LogRocket.log(`Unable to clear Heap Session: ${String(error.message)}`);
    } else {
      LogRocket.log(`Unable to clear Heap Session: ${String(error)}`);
    }
  }
};
