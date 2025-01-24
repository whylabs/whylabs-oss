import { renderHook } from '@testing-library/react';

import { UseMutationPropertiesProps, useMutationProperties } from './useMutationProperties';

describe('useMutationProperties()', () => {
  it('should return isSaving=false when both mutation and revalidator are not loading', () => {
    const { result } = getHookRenderer({
      mutation: createMutation({ isLoading: false }),
      revalidator: { state: 'idle' },
    });

    expect(result.current.isSaving).toBe(false);
  });

  it('should return isSaving=true when mutation is loading', () => {
    const { result } = getHookRenderer({
      mutation: createMutation({ isLoading: true }),
      revalidator: { state: 'idle' },
    });

    expect(result.current.isSaving).toBe(true);
  });

  it('should return isSaving=true when revalidator is loading', () => {
    const { result } = getHookRenderer({
      mutation: createMutation({ isLoading: false }),
      revalidator: { state: 'loading' },
    });

    expect(result.current.isSaving).toBe(true);
  });
});

// Test utils
const getHookRenderer = (props: UseMutationPropertiesProps<any, any, any, any>) => {
  return renderHook(() => useMutationProperties(props));
};

const createMutation = (props: { isLoading: boolean }) => ({
  ...props,
  mutateAsync: jest.fn(),
});
